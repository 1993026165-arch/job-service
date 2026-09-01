/**
 * ============================================================
 * 可视化内容编辑器逻辑（admin.html 使用）
 * ============================================================
 * 功能：
 *   1. 读取 js/config.js（window.PRICE_CONFIG）
 *   2. 渲染成中文表单，支持数组项 增/删/改
 *   3. 校验 → 生成完整 config.js 文本 → 触发浏览器下载
 *   4. 恢复当前配置 / 预览正式网页
 *
 * 说明：本文件不依赖任何框架，可在 file:// 双击打开使用。
 * ============================================================
 */
(function () {
  'use strict';

  /* ---------------- 工具 ---------------- */

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function checked(v) { return v ? ' checked' : ''; }

  function children(el) { return Array.prototype.slice.call(el.children); }

  /* ---------------- 初始数据 ---------------- */

  var INITIAL = deepClone(window.PRICE_CONFIG || null);

  if (!INITIAL) {
    document.getElementById('form').innerHTML =
      '<div class="card"><h2>⚠️ 未找到配置</h2>' +
      '<p style="font-size:14px;color:#57606a;">没有读取到 js/config.js。<br>' +
      '请确认 admin.html 与 js/config.js 位于同一目录（price-page/）。</p></div>';
    throw new Error('config.js not loaded');
  }

  /* ---------------- 字段定义 ---------------- */

  var NAV_FIELDS = [
    { name: 'id', type: 'hidden', auto: true },
    { name: 'label', label: '导航名称' },
    { name: 'active', label: '默认高亮', type: 'checkbox' }
  ];
  var FREE_FIELDS = [{ name: 'name', label: '服务名称' }];
  var SINGLE_FIELDS = [
    { name: 'num', label: '序号', type: 'number' },
    { name: 'name', label: '服务名称' },
    { name: 'price', label: '价格(元)' },
    { name: 'vb', label: 'VIP标签(选填)' }
  ];
  var STAT_FIELDS = [
    { name: 'num', label: '数字' },
    { name: 'label', label: '说明' }
  ];
  var CARD_FIELDS = [
    { name: 'name', label: '套餐名' },
    { name: 'sub', label: '副标题' },
    { name: 'limit', label: '名额限制' },
    { name: 'price', label: '价格(元)' },
    { name: 'unit', label: '价格单位' },
    { name: 'rec', label: '推荐(红框)', type: 'checkbox' }
  ];
  var OURS_FIELDS = [
    { name: 'name', label: '套餐名' },
    { name: 'features', label: '包含服务' },
    { name: 'price', label: '价格' },
    { name: 'note', label: '备注(选填)' },
    { name: 'small', label: '小号显示', type: 'checkbox' }
  ];
  var CONTACT_FIELDS = [
    { name: 'label', label: '标签' },
    { name: 'value', label: '内容' },
    { name: 'copy', label: '可点击复制', type: 'checkbox' }
  ];

  /* ---------------- 表单行模板 ---------------- */

  function strRow(value) {
    return '<div class="arr-item"><input type="text" value="' + esc(value) +
      '"><button type="button" class="del">删除</button></div>';
  }

  function nestRow(hl, text) {
    return '<div class="arr-item">' +
      '<input type="text" class="nest-hl" placeholder="高亮词(选填)" value="' + esc(hl) + '">' +
      '<input type="text" class="nest-text" placeholder="说明(必填)" value="' + esc(text) + '">' +
      '<button type="button" class="del">删除</button></div>';
  }

  function objRow(obj, fields, nestRows) {
    var inner = fields.map(function (f) {
      if (f.type === 'checkbox') {
        return '<label class="chk"><input type="checkbox" data-field="' + f.name + '"' +
          checked(obj[f.name]) + '>' + esc(f.label) + '</label>';
      }
      if (f.type === 'hidden') {
        var v = obj[f.name] || (f.auto ? 'sec' + Math.random().toString(36).slice(2, 8) : '');
        return '<input type="hidden" data-field="' + f.name + '" value="' + esc(v) + '">';
      }
      if (f.type === 'number') {
        return '<input type="number" data-field="' + f.name + '" placeholder="' + esc(f.label) +
          '" value="' + esc(obj[f.name] == null ? '' : obj[f.name]) + '">';
      }
      return '<input type="text" data-field="' + f.name + '" placeholder="' + esc(f.label) +
        '" value="' + esc(obj[f.name] == null ? '' : obj[f.name]) + '">';
    }).join('');

    var nestHtml = '';
    if (nestRows) {
      nestHtml = '<div class="nest">' +
        nestRows.map(function (r) {
          var hl = (typeof r === 'string') ? '' : (r.hl || '');
          var tx = (typeof r === 'string') ? r : (r.text || '');
          return nestRow(hl, tx);
        }).join('') +
        '<button type="button" class="add sub" data-nest-add>＋ 添加权益</button></div>';
    }
    return '<div class="arr-item' + (nestRows ? ' with-nest' : '') + '">' + inner +
      '<button type="button" class="del">删除</button>' + nestHtml + '</div>';
  }

  function markSelect(obj) {
    var opts = [
      ['', '普通'],
      ['red', '红色高亮'],
      ['yellow', '黄色高亮']
    ];
    return '<select data-field="mark">' + opts.map(function (op) {
      return '<option value="' + op[0] + '"' + (obj.mark === op[0] ? ' selected' : '') + '>' + op[1] + '</option>';
    }).join('') + '</select>';
  }

  function arrBox(id, dataArray, itemType, fieldsJson, nestJson, rowsHtml) {
    return '<div class="arr-box" id="' + id + '" data-array="' + dataArray +
      '" data-item-type="' + itemType + '"' +
      (fieldsJson ? ' data-fields="' + esc(fieldsJson) + '"' : '') +
      (nestJson ? ' data-nest="' + esc(nestJson) + '"' : '') + '>' +
      rowsHtml + '<button type="button" class="add">＋ 添加</button></div>';
  }

  function scalarRow(label, path, value) {
    return '<div class="f-row"><label>' + label + '</label>' +
      '<input type="text" data-path="' + path + '" value="' + esc(value) + '"></div>';
  }

  /* ---------------- 数组渲染 ---------------- */

  function renderStrArr(name, list) {
    return arrBox('arr-' + name, name, 'str', '', '',
      list.map(strRow).join(''));
  }

  function renderObjArr(name, list, fields) {
    var rows = list.map(function (it) {
      if (name === 'compare.g0.items' || name === 'compare.g1.items' || name === 'compare.g2.items') {
        return '<div class="arr-item">' +
          '<input type="text" data-field="name" placeholder="机构/项目" value="' + esc(it.name) + '">' +
          '<input type="text" data-field="price" placeholder="价格" value="' + esc(it.price) + '">' +
          markSelect(it) +
          '<button type="button" class="del">删除</button></div>';
      }
      return objRow(it, fields, null);
    }).join('');
    return arrBox('arr-' + name, name, 'obj', JSON.stringify(fields), '', rows);
  }

  function renderCards(list) {
    var rows = list.map(function (c) {
      return objRow(c, CARD_FIELDS, c.features || []);
    }).join('');
    return arrBox('arr-premium.cards', 'premium.cards', 'obj',
      JSON.stringify(CARD_FIELDS), '{"features":"str"}', rows);
  }

  function renderGroups(groups) {
    return groups.map(function (g, i) {
      var rows = (g.items || []).map(function (it) {
        return '<div class="arr-item">' +
          '<input type="text" data-field="name" placeholder="机构/项目" value="' + esc(it.name) + '">' +
          '<input type="text" data-field="price" placeholder="价格" value="' + esc(it.price) + '">' +
          markSelect(it) +
          '<button type="button" class="del">删除</button></div>';
      }).join('');
      return '<div class="card" data-group="' + i + '"><h2>同行对比 · 第 ' + (i + 1) + ' 组</h2>' +
        '<div class="f-grid">' +
        scalarRow('分组图标（如 🏆）', 'g' + i + '.icon', g.icon) +
        scalarRow('分组标题', 'g' + i + '.title', g.title) +
        '</div>' +
        arrBox('arr-g' + i + '.items', 'g' + i + '.items', 'obj', '', '', rows) +
        '</div>';
    }).join('');
  }

  /* ---------------- 主表单构建 ---------------- */

  function buildForm() {
    var C = INITIAL;
    var html = '';

    /* ① 品牌与页面 */
    html += '<div class="card"><h2>① 品牌与页面设置</h2><div class="f-grid">' +
      scalarRow('页面标题（浏览器标签）', 'pageTitle', C.pageTitle) +
      scalarRow('品牌名称', 'brand.title', C.brand && C.brand.title) +
      scalarRow('品牌副标题（橙色部分）', 'brand.sub', C.brand && C.brand.sub) +
      scalarRow('Slogan（副标题）', 'brand.slogan', C.brand && C.brand.slogan) +
      scalarRow('顶部比价钩子（tagline）', 'brand.tagline', C.brand && C.brand.tagline) +
      '</div></div>';

    /* ② 导航 */
    html += '<div class="card"><h2>② 导航菜单 <span class="count">' + (C.nav || []).length + ' 项</span></h2>' +
      renderObjArr('nav', C.nav || [], NAV_FIELDS) +
      '<p style="font-size:12px;color:#8b949e;margin-top:6px;">导航名称可随意修改；锚点 ID 自动保留，新增项请勿手动填写 ID。</p>' +
      '</div>';

    /* ③ 免费服务 */
    html += '<div class="card"><h2>③ 免费服务 <span class="count">' + (C.free.items || []).length + ' 项</span></h2><div class="f-grid">' +
      scalarRow('模块标签（badge）', 'free.badge', C.free.badge) +
      scalarRow('模块标题', 'free.title', C.free.title) +
      scalarRow('每项右侧绿色小标签', 'free.itemTag', C.free.itemTag) +
      '</div>' + renderObjArr('free.items', C.free.items || [], FREE_FIELDS) + '</div>';

    /* ④ 单项服务 */
    html += '<div class="card"><h2>④ 单项服务 <span class="count">' + (C.single.items || []).length + ' 项</span></h2><div class="f-grid">' +
      scalarRow('模块标签（badge）', 'single.badge', C.single.badge) +
      scalarRow('模块标题', 'single.title', C.single.title) +
      '</div><p style="font-size:12px;color:#8b949e;margin:0 0 8px;">填写“价格”即显示价格；不填价格则填“VIP标签”（如 VIP专属）。</p>' +
      renderObjArr('single.items', C.single.items || [], SINGLE_FIELDS) + '</div>';

    /* ⑤ VIP 全包 */
    html += '<div class="card"><h2>⑤ VIP 全包套餐</h2><div class="f-grid">' +
      scalarRow('模块标签（badge）', 'vip.badge', C.vip.badge) +
      scalarRow('模块标题', 'vip.title', C.vip.title) +
      scalarRow('套餐名称', 'vip.name', C.vip.name) +
      scalarRow('标题旁小字', 'vip.sub', C.vip.sub) +
      scalarRow('★ 套餐价格', 'vip.price', C.vip.price) +
      scalarRow('价格单位', 'vip.priceUnit', C.vip.priceUnit) +
      scalarRow('价格下方备注', 'vip.note', C.vip.note) +
      scalarRow('金色加粗卖点句', 'vip.slogan', C.vip.slogan) +
      '</div>' +
      scalarRow('卖点详细说明', 'vip.sloganDetail', C.vip.sloganDetail) +
      '<div style="font-size:12px;color:#57606a;margin:10px 0 6px;">VIP 权益清单（右侧列表）：</div>' +
      renderStrArr('vip.features', C.vip.features || []) +
      '</div>';

    /* ⑥ 尊享私教 */
    html += '<div class="card"><h2>⑥ 尊享私教</h2><div class="f-grid">' +
      scalarRow('模块标签（badge）', 'premium.badge', C.premium.badge) +
      scalarRow('模块标题', 'premium.title', C.premium.title) +
      scalarRow('头像圆内文字', 'premium.avatar', C.premium.avatar) +
      scalarRow('导师名字', 'premium.name', C.premium.name) +
      scalarRow('名字旁小标签', 'premium.tag', C.premium.tag) +
      '</div>' +
      scalarRow('导师介绍（desc）', 'premium.desc', C.premium.desc) +
      '<div style="font-size:12px;color:#57606a;margin:10px 0 6px;">导师数据统计：</div>' +
      renderObjArr('premium.stats', C.premium.stats || [], STAT_FIELDS) +
      '<div style="font-size:12px;color:#57606a;margin:14px 0 6px;">套餐卡（每卡含权益清单）：</div>' +
      renderCards(C.premium.cards || []) +
      '</div>';

    /* ⑦ 同行对比 */
    html += '<div class="card"><h2>⑦ 同行对比</h2><div class="f-grid">' +
      scalarRow('模块标签（badge）', 'compare.badge', C.compare.badge) +
      scalarRow('模块标题', 'compare.title', C.compare.title) +
      scalarRow('自己品牌标题（🔥 开头）', 'compare.oursTitle', C.compare.oursTitle) +
      scalarRow('数据来源声明', 'compare.source', C.compare.source) +
      '</div>' +
      '<div style="font-size:12px;color:#57606a;margin:10px 0 6px;">市场价分组（分组标题可改，组数固定 3 组）：</div>' +
      renderGroups(C.compare.groups || []) +
      '<div style="font-size:12px;color:#57606a;margin:14px 0 6px;">自己的套餐（绿色高亮块）：</div>' +
      renderObjArr('compare.ours', C.compare.ours || [], OURS_FIELDS) +
      '<div style="font-size:12px;color:#57606a;margin:14px 0 6px;">底部统计数字：</div>' +
      renderObjArr('compare.stats', C.compare.stats || [], STAT_FIELDS) +
      '<div style="font-size:12px;color:#57606a;margin:14px 0 6px;">红色结论框：</div><div class="f-grid">' +
      scalarRow('市场均价', 'compare.conclusion.market', C.compare.conclusion.market) +
      scalarRow('分隔符', 'compare.conclusion.sep', C.compare.conclusion.sep) +
      scalarRow('自家价格结论', 'compare.conclusion.ours', C.compare.conclusion.ours) +
      scalarRow('副说明', 'compare.conclusion.sub', C.compare.conclusion.sub) +
      '</div></div>';

    /* ⑧ 其他 */
    html += '<div class="card"><h2>⑧ 底部文案 / 案例 / 联系栏</h2>' +
      scalarRow('底部说明（bottom-note）', 'bottomNote', C.bottomNote) +
      '<div class="f-grid">' +
      scalarRow('案例按钮文字', 'caseLink.text', C.caseLink.text) +
      scalarRow('案例链接 URL', 'caseLink.url', C.caseLink.url) +
      '</div>' +
      '<div style="font-size:12px;color:#57606a;margin:10px 0 6px;">联系栏（勾选“可点击复制”后访客可一键复制）：</div>' +
      renderObjArr('contact.items', C.contact.items || [], CONTACT_FIELDS) +
      scalarRow('页脚文字', 'footer', C.footer) +
      '</div>';

    document.getElementById('form').innerHTML = html;
  }

  /* ---------------- 收集表单值 ---------------- */

  function scalar(path) {
    var el = document.querySelector('[data-path="' + path + '"]');
    return el ? el.value.trim() : '';
  }

  function collectArr(name) {
    var box = document.querySelector('[data-array="' + name + '"]');
    if (!box) return [];
    var out = [];
    children(box).forEach(function (row) {
      if (!row.classList.contains('arr-item')) return;
      // 字符串数组项
      var strInput = null;
      children(row).forEach(function (el) {
        if (el.tagName === 'INPUT' && !el.getAttribute('data-field')) strInput = el;
      });
      if (strInput) { out.push(strInput.value.trim()); return; }
      // 对象数组项
      var obj = {};
      row.querySelectorAll('[data-field]').forEach(function (el) {
        var key = el.getAttribute('data-field');
        if (el.type === 'checkbox') { if (el.checked) obj[key] = true; }
        else if (el.type === 'number') { if (el.value !== '') obj[key] = Number(el.value); }
        else if (el.value.trim() !== '') obj[key] = el.value.trim();
      });
      // 嵌套数组（如套餐卡的权益：hl 高亮词 + text 说明）
      var nest = row.querySelector('.nest');
      if (nest) {
        var nestArr = [];
        children(nest).forEach(function (r) {
          if (r.classList.contains('arr-item')) {
            var hlEl = r.querySelector('.nest-hl');
            var txEl = r.querySelector('.nest-text');
            if (txEl && txEl.value.trim()) {
              var item = {};
              if (hlEl && hlEl.value.trim()) item.hl = hlEl.value.trim();
              item.text = txEl.value.trim();
              nestArr.push(item);
            }
          }
        });
        obj.features = nestArr;
      }
      out.push(obj);
    });
    return out;
  }

  function collectGroups() {
    var groups = [];
    document.querySelectorAll('[data-group]').forEach(function (g) {
      var i = g.getAttribute('data-group');
      var grp = {};
      var icon = scalar('g' + i + '.icon');
      var title = scalar('g' + i + '.title');
      if (icon) grp.icon = icon;
      if (title) grp.title = title;
      grp.items = collectArr('g' + i + '.items');
      groups.push(grp);
    });
    return groups;
  }

  function collect() {
    var o = {};
    o.pageTitle = scalar('pageTitle');
    o.brand = {
      title: scalar('brand.title'),
      sub: scalar('brand.sub'),
      slogan: scalar('brand.slogan'),
      tagline: scalar('brand.tagline')
    };
    o.nav = collectArr('nav');
    o.free = {
      badge: scalar('free.badge'),
      title: scalar('free.title'),
      itemTag: scalar('free.itemTag'),
      items: collectArr('free.items')
    };
    o.single = {
      badge: scalar('single.badge'),
      title: scalar('single.title'),
      items: collectArr('single.items')
    };
    o.vip = {
      badge: scalar('vip.badge'),
      title: scalar('vip.title'),
      name: scalar('vip.name'),
      sub: scalar('vip.sub'),
      price: scalar('vip.price'),
      priceUnit: scalar('vip.priceUnit'),
      note: scalar('vip.note'),
      slogan: scalar('vip.slogan'),
      sloganDetail: scalar('vip.sloganDetail'),
      features: collectArr('vip.features')
    };
    o.premium = {
      badge: scalar('premium.badge'),
      title: scalar('premium.title'),
      avatar: scalar('premium.avatar'),
      name: scalar('premium.name'),
      tag: scalar('premium.tag'),
      stats: collectArr('premium.stats'),
      desc: scalar('premium.desc'),
      cards: collectArr('premium.cards')
    };
    o.compare = {
      badge: scalar('compare.badge'),
      title: scalar('compare.title'),
      groups: collectGroups(),
      oursTitle: scalar('compare.oursTitle'),
      ours: collectArr('compare.ours'),
      stats: collectArr('compare.stats'),
      conclusion: {
        market: scalar('compare.conclusion.market'),
        sep: scalar('compare.conclusion.sep'),
        ours: scalar('compare.conclusion.ours'),
        sub: scalar('compare.conclusion.sub')
      },
      source: scalar('compare.source')
    };
    o.bottomNote = scalar('bottomNote');
    o.caseLink = {
      text: scalar('caseLink.text'),
      url: scalar('caseLink.url')
    };
    o.contact = { items: collectArr('contact.items') };
    o.footer = scalar('footer');
    return o;
  }

  /* ---------------- 校验 ---------------- */

  function validate(o) {
    var errs = [];
    if (!o.pageTitle) errs.push('页面标题不能为空');
    if (!o.brand.title) errs.push('品牌名称不能为空');

    (o.nav || []).forEach(function (n, i) {
      if (!n.label) errs.push('导航第 ' + (i + 1) + ' 项名称不能为空');
    });
    if (!o.free.title) errs.push('免费服务标题不能为空');
    (o.free.items || []).forEach(function (it, i) {
      if (!it.name) errs.push('免费服务第 ' + (i + 1) + ' 项名称不能为空');
    });
    if (!o.single.title) errs.push('单项服务标题不能为空');
    (o.single.items || []).forEach(function (it, i) {
      var n = i + 1;
      if (it.num === undefined || isNaN(it.num)) errs.push('单项服务第 ' + n + ' 项序号不正确');
      if (!it.name) errs.push('单项服务第 ' + n + ' 项名称不能为空');
      if (!it.price && !it.vb) errs.push('单项服务第 ' + n + ' 项需填写价格或VIP标签');
    });
    if (!o.vip.name) errs.push('VIP套餐名称不能为空');
    if (!o.vip.price) errs.push('VIP价格不能为空');
    (o.vip.features || []).forEach(function (f, i) {
      if (!f) errs.push('VIP权益第 ' + (i + 1) + ' 项不能为空');
    });

    (o.premium.cards || []).forEach(function (c, i) {
      if (!c.name) errs.push('私教套餐第 ' + (i + 1) + ' 项名称不能为空');
      if (!c.price) errs.push('私教套餐第 ' + (i + 1) + ' 项价格不能为空');
      (c.features || []).forEach(function (f, j) {
        if (!f) errs.push('私教套餐「' + c.name + '」权益第 ' + (j + 1) + ' 条不能为空');
      });
    });

    (o.compare.groups || []).forEach(function (g, gi) {
      var gname = g.title ? '「' + g.title + '」' : ('第 ' + (gi + 1) + ' 组');
      (g.items || []).forEach(function (it, i) {
        if (!it.name) errs.push('同行对比' + gname + '第 ' + (i + 1) + ' 项名称不能为空');
        if (!it.price) errs.push('同行对比' + gname + '第 ' + (i + 1) + ' 项价格不能为空');
      });
    });

    if (o.caseLink.url && !/^https?:\/\/\S+$/i.test(o.caseLink.url)) {
      errs.push('案例链接格式不正确（需以 http:// 或 https:// 开头）');
    }
    (o.contact.items || []).forEach(function (c, i) {
      if (!c.label) errs.push('联系栏第 ' + (i + 1) + ' 项标签不能为空');
      if (!c.value) errs.push('联系栏第 ' + (i + 1) + ' 项内容不能为空');
    });
    return errs;
  }

  /* ---------------- 序列化（生成 config.js 文本） ---------------- */

  function q(s) {
    return "'" + String(s)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t') + "'";
  }

  function ser(v, ind) {
    var pad = '  '.repeat(ind);
    var padIn = '  '.repeat(ind + 1);
    if (typeof v === 'string') return q(v);
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (v === null || v === undefined) return 'undefined';
    if (Array.isArray(v)) {
      if (!v.length) return '[]';
      return '[\n' + v.map(function (x) { return padIn + ser(x, ind + 1); }).join(',\n') + '\n' + pad + ']';
    }
    var keys = Object.keys(v);
    if (!keys.length) return '{}';
    return '{\n' + keys.map(function (k) { return padIn + k + ': ' + ser(v[k], ind + 1); }).join(',\n') + '\n' + pad + '}';
  }

  function serialize(o) {
    return '/* ============================================================\n' +
      ' * 由 admin.html 内容编辑器生成\n' +
      ' * 修改内容请使用 admin.html，或直接编辑本文件\n' +
      ' * ============================================================ */\n' +
      'window.PRICE_CONFIG = ' + ser(o, 1) + ';\n';
  }

  /* ---------------- 下载 ---------------- */

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------------- 提示区 ---------------- */

  function showErrors(errs) {
    var box = document.getElementById('errors');
    document.getElementById('okmsg').hidden = true;
    box.hidden = false;
    box.innerHTML = '<b>请先修正以下问题：</b><ul>' +
      errs.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>';
  }

  function showOk(msg) {
    var box = document.getElementById('okmsg');
    document.getElementById('errors').hidden = true;
    box.hidden = false;
    box.textContent = msg;
  }

  function clearMsg() {
    document.getElementById('errors').hidden = true;
    document.getElementById('okmsg').hidden = true;
  }

  /* ---------------- 生成流程 ---------------- */

  function generate() {
    var obj = collect();
    var errs = validate(obj);
    if (errs.length) { showErrors(errs); return; }
    var code = serialize(obj);
    try {
      new Function('window', code + '; return window.PRICE_CONFIG;')({});
    } catch (e) {
      showErrors(['生成的配置存在语法错误：' + e.message]);
      return;
    }
    download('config.js', code, 'text/javascript;charset=utf-8');
    showOk('✅ 已生成 config.js（浏览器已开始下载）。请用下载的文件替换项目中的 js/config.js。');
  }

  /**
   * 发布到网站：
   * 1. 收集表单 → 校验 → 序列化 → 语法检查
   * 2. 下载 config.js（浏览器侧唯一能做的事）
   * 3. 提示用户：替换 js/config.js 后，在 WorkBuddy 中发送「发布到网站」，
   *    由本地 GitHub CLI 完成 git commit + push，GitHub Pages 自动更新线上页面。
   *    全程不涉及任何 Token（凭据由 gh keyring 托管）。
   */
  function publish() {
    var obj = collect();
    var errs = validate(obj);
    if (errs.length) { showErrors(errs); return; }
    var code = serialize(obj);
    try {
      new Function('window', code + '; return window.PRICE_CONFIG;')({});
    } catch (e) {
      showErrors(['生成的配置存在语法错误：' + e.message]);
      return;
    }
    download('config.js', code, 'text/javascript;charset=utf-8');
    var box = document.getElementById('okmsg');
    document.getElementById('errors').hidden = true;
    box.hidden = false;
    box.innerHTML =
      '✅ 配置已生成，浏览器已开始下载 config.js。<br><br>' +
      '下一步（3 步）：<br>' +
      '① 用下载的 config.js 替换项目中的 <code>js/config.js</code><br>' +
      '② 回到 WorkBuddy 对话，发送：<b>「发布到网站」</b><br>' +
      '③ 助手自动执行 git 提交并推送到 GitHub，Pages 自动更新线上页面。';
  }

  function restore() {
    if (!window.confirm('确定恢复为打开本页时的配置吗？当前表单的修改将丢失。')) return;
    INITIAL = deepClone(window.PRICE_CONFIG || {});
    buildForm();
    clearMsg();
  }

  function preview() {
    window.open('index.html', '_blank');
  }

  /* ---------------- 事件绑定 ---------------- */

  document.getElementById('btnGenerate').addEventListener('click', generate);
  document.getElementById('btnPublish').addEventListener('click', publish);
  document.getElementById('btnRestore').addEventListener('click', restore);
  document.getElementById('btnPreview').addEventListener('click', preview);

  document.getElementById('form').addEventListener('click', function (e) {
    var t = e.target;
    if (t.classList.contains('del')) {
      var row = t.closest('.arr-item');
      if (row && row.parentNode) row.parentNode.removeChild(row);
      return;
    }
    if (t.hasAttribute('data-nest-add')) {
      var nest = t.closest('.nest');
      if (nest) nest.insertAdjacentHTML('beforeend', nestRow('', ''));
      return;
    }
    if (t.classList.contains('add')) {
      var box = t.closest('.arr-box');
      if (!box) return;
      if (box.getAttribute('data-item-type') === 'str') {
        box.insertAdjacentHTML('beforeend', strRow(''));
      } else {
        var fields = JSON.parse(box.getAttribute('data-fields') || '[]');
        box.insertAdjacentHTML('beforeend', objRow({}, fields, null));
      }
    }
  });

  /* ---------------- 启动 ---------------- */

  buildForm();

  // 暴露给外部测试使用
  window.AdminApp = {
    collect: collect,
    validate: validate,
    serialize: serialize,
    generate: generate,
    publish: publish,
    restore: restore,
    preview: preview,
    buildForm: buildForm,
    getInitial: function () { return deepClone(INITIAL); }
  };
})();
