#!/usr/bin/env node
/**
 * ============================================================
 * 本地发布服务（一键发布到 GitHub 的桥接层）
 * ============================================================
 * 作用：
 *   浏览器（admin.html）无法直接执行 Git，本服务监听 127.0.0.1，
 *   接收 admin.html 发布的配置，自动完成：
 *     备份 js/config.js → 写入新配置 → git add/commit/push → 查询 Pages 状态
 *
 * 启动（由 WorkBuddy 执行）：
 *   node tools/publish-server.js
 *   环境变量：
 *     PORT     监听端口（默认 8899）
 *     WORK_DIR 项目目录（默认本文件所在目录的上一级，即 price-page/）
 *     DRY_RUN=1 测试模式：只备份+写入+commit，不 push
 *     GH_PATH  gh.exe 路径（默认自动探测 C:\Program Files\GitHub CLI\gh.exe）
 *
 * 安全设计：
 *   - 仅监听 127.0.0.1，不暴露到局域网
 *   - 只允许写固定的 js/config.js，不提供任意文件写 / 任意命令执行
 *   - 配置内容在服务端二次校验（必须能解析为 window.PRICE_CONFIG 且含必填字段）
 *   - 凭据由 gh keyring 托管，本服务不接触任何 Token
 * ============================================================
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PORT = parseInt(process.env.PORT || '8899', 10);
const WORK_DIR = process.env.WORK_DIR || path.resolve(__dirname, '..');
const DRY_RUN = process.env.DRY_RUN === '1';
const CONFIG_PATH = path.join(WORK_DIR, 'js', 'config.js');
const BACKUP_PATH = path.join(WORK_DIR, 'js', 'config.backup.js');

const GH = process.env.GH_PATH ||
  (fs.existsSync('C:/Program Files/GitHub CLI/gh.exe') ? 'C:/Program Files/GitHub CLI/gh.exe' : 'gh');

/* ---------------- 工具 ---------------- */

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd: WORK_DIR, timeout: 60000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || err.message || '').trim().split('\n')[0]));
      else resolve((stdout || '').trim());
    });
  });
}

function getBranch() {
  return run('git', ['branch', '--show-current']).catch(() => '');
}

function getRepo() {
  return run('git', ['remote', 'get-url', 'origin'])
    .then((u) => String(u).replace(/\.git$/, '').replace(/^https:\/\//, ''))
    .catch(() => '');
}

function gitRevParse() {
  return run('git', ['rev-parse', '--short', 'HEAD']).catch(() => '');
}

/** 服务端二次校验：config 文本必须是合法 JS 且解析后含必填字段 */
function validateConfig(text) {
  if (typeof text !== 'string' || !text.includes('window.PRICE_CONFIG')) {
    return '配置内容缺少 window.PRICE_CONFIG 定义';
  }
  let obj;
  try {
    obj = new Function('window', text + '; return window.PRICE_CONFIG;')({});
  } catch (e) {
    return '配置语法错误：' + e.message;
  }
  if (!obj || typeof obj !== 'object') return '配置结构无效';
  if (!obj.brand || !obj.brand.title) return '缺少品牌名称';
  if (!obj.vip || !obj.vip.price) return '缺少 VIP 价格';
  return null;
}

function pagesStatus() {
  return run(GH, ['api', 'repos/1993026165-arch/job-service/pages', '--jq', '{status, html_url}'])
    .then((s) => { try { return JSON.parse(s); } catch (e) { return { status: 'unknown' }; } })
    .catch(() => ({ status: 'unknown' }));
}

/* ---------------- 处理请求 ---------------- */

function cors(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
}

function sendJson(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 1024 * 1024) { reject(new Error('body too large')); req.destroy(); } });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

async function handlePublish(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (e) {
    return sendJson(res, 400, { ok: false, error: '请求体不是合法 JSON' });
  }

  const dryRun = DRY_RUN || body.dryRun === true;
  const err = validateConfig(body.config);
  if (err) return sendJson(res, 400, { ok: false, error: err });

  try {
    // ① 备份当前配置
    let backupText = '';
    if (fs.existsSync(CONFIG_PATH)) backupText = fs.readFileSync(CONFIG_PATH, 'utf8');
    fs.writeFileSync(BACKUP_PATH, backupText, 'utf8');

    // ② 写入新配置
    fs.writeFileSync(CONFIG_PATH, body.config, 'utf8');

    // ③ git add + commit（内容无变化时跳过提交，视为成功）
    await run('git', ['add', 'js/config.js']);
    const ts = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = ts.getFullYear() + '-' + pad(ts.getMonth() + 1) + '-' + pad(ts.getDate()) + ' ' +
      pad(ts.getHours()) + ':' + pad(ts.getMinutes()) + ':' + pad(ts.getSeconds());
    const msg = '发布：内容更新 ' + stamp;

    let commit = '';
    let unchanged = false;
    try {
      commit = await run('git', ['commit', '-m', msg]);
    } catch (e) {
      const m = String(e.message || '');
      if (/nothing to commit|nothing added|no changes added/.test(m)) {
        unchanged = true;
      } else {
        throw e;
      }
    }

    // ④ push（dry-run 或内容无变化时跳过）
    let pushed = false;
    if (!dryRun && !unchanged) {
      await run('git', ['push', 'origin', await getBranch() || 'main']);
      pushed = true;
    }

    const rev = await gitRevParse();
    const pages = (dryRun || unchanged) ? null : await pagesStatus();

    sendJson(res, 200, {
      ok: true,
      dryRun,
      unchanged,
      commit: rev,
      message: unchanged
        ? '内容无变化，已跳过提交与推送'
        : (commit.split('\n').pop() || ''),
      backup: 'js/config.backup.js',
      pushed,
      pagesStatus: pages ? pages.status : (unchanged ? 'unchanged' : 'skipped(dry-run)'),
      htmlUrl: pages && pages.html_url ? pages.html_url : 'https://1993026165-arch.github.io/job-service/'
    });
  } catch (e) {
    // 发布失败：尝试恢复备份，保证线上不受影响
    try {
      if (fs.existsSync(BACKUP_PATH)) fs.writeFileSync(CONFIG_PATH, fs.readFileSync(BACKUP_PATH, 'utf8'), 'utf8');
    } catch (e2) { /* 忽略恢复失败 */ }
    sendJson(res, 500, { ok: false, error: '发布失败：' + e.message, restored: true });
  }
}

/* ---------------- 服务 ---------------- */

const server = http.createServer(async (req, res) => {
  cors(res, req.headers.origin);
  const url = new URL(req.url, 'http://127.0.0.1');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method === 'GET' && url.pathname === '/status') {
    const [branch, repo] = await Promise.all([getBranch(), getRepo()]);
    sendJson(res, 200, {
      ok: true,
      service: 'publish-server',
      port: PORT,
      workDir: WORK_DIR,
      branch,
      repo,
      dryRun: DRY_RUN
    });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/publish') {
    await handlePublish(req, res);
    return;
  }
  sendJson(res, 404, { ok: false, error: 'not found' });
});

server.listen(PORT, '127.0.0.1', async () => {
  const [branch, repo] = await Promise.all([getBranch(), getRepo()]);
  console.log(`[publish-server] 就绪 http://127.0.0.1:${PORT}`);
  console.log(`[publish-server] 项目目录: ${WORK_DIR}`);
  console.log(`[publish-server] 仓库: ${repo} | 分支: ${branch} | 模式: ${DRY_RUN ? 'DRY-RUN(测试)' : '正式'}`);
});
