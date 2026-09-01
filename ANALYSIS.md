# 米推兔价格页 · 逆向分析报告（第一阶段）

> 目标：参考并重建属于自己（老板）的独立价格页
> 阶段：仅分析 + 建立项目文件，未修改任何内容
> 源站：https://kingfree5.github.io/mituitui-price/
> 源码仓库：github.com/kingfree5/mituitui-price（只读查看，未做任何修改）

---

## 1. 结论速览

| 项目 | 结果 |
|---|---|
| 技术栈 | 纯静态单文件（HTML + 内嵌 CSS + 内嵌 JS） |
| 外部依赖 | **零**（无 CDN、无图片、无字体、无框架） |
| 文件数量 | 对方仓库仅有 **1 个文件**：`index.html`（27,036 字节） |
| 能否 GitHub Pages 部署 | ✅ 可以直接部署 |
| 重建所需文件 | 仅 `index.html` 1 个文件 |
| 响应式 | 有，2 个断点（700px / 640px） |

---

## 2. 页面整体结构

单页长滚动营销页（One-page），自上而下 8 个模块，目标明确：**展示价格 → 制造比价锚点 → 引导加微信**。

```
<body> 背景 #f5f6fa，居中容器 max-width 1000px
 ├─ ① 顶部导航 .nav            sticky 吸顶，5 个锚点跳转，滚动高亮
 ├─ ② 页头 .header             品牌名 + 卖点副标题 + 比价钩子 tagline
 ├─ ③ 免费服务 #free           6 个免费项，绿色圆点 + 免费胶囊标签
 ├─ ④ 单项服务 #single         7 个单品，蓝色序号圆 + 价格（2 项 VIP专属）
 ├─ ⑤ VIP全包 #vip             深色渐变横幅卡：左价格+slogan / 右功能清单
 ├─ ⑥ 尊享私教 #premium        导师人设卡 + 3 张套餐卡（校招2999/社招3999/实习2499）
 ├─ ⑦ 同行对比 #compare        三档市场价列表 + 自己价格高亮 + 统计 + 结论框
 ├─ ⑧ 底部转化区               底部说明 + 案例外链 + 联系栏(微信/手机可复制) + footer
 + 浮动 toast（JS 动态生成）
```

**营销逻辑层级**：免费(引流) → 单项(试水) → VIP全包(主推) → 尊享私教(高客单) → 同行对比(促成交) → 联系(转化)。核心成交钩子是"同行对比"模块，用市场 5 位数价格衬托自己 1199 元。

---

## 3. HTML 结构分析

- `<!DOCTYPE html>` / `lang="zh-CN"` / UTF-8 / 标准 viewport
- `<head>` 内只有一个 `<style>` 块，**无任何 `<link>` 外部资源**
- `<body>` 内只有一个 `.container` 包裹全部内容
- 每个 section 用 `id` 供导航锚点定位：`#free` `#single` `#vip` `#premium` `#compare`
- 所有图标均为 Unicode/emoji 字符（✓ \2713、🏆、📌、🔧、🔥、🐰、📂），无 img 标签
- 联系方式用 `data-copy` 属性存值，JS 读取复制（微信号 `tuge_vip`、手机 `17723005416`）
- 外链仅 1 个：飞书案例合集（`target="_blank" rel="noopener"`）

---

## 4. CSS 分析

### 4.1 布局
- `.container { max-width: 1000px; margin: 0 auto; }` 居中，body 左右留 12px 边距
- 栅格系统：`.free-grid` / `.items` / `.card-grid` 均为 grid（桌面 2-3 列，移动 1 列）
- `.vip-wrap` / `.premium-intro` 用 flex 左右分栏，移动端变 column
- 卡片间距：section margin-top 20px，内边距 28px

### 4.2 字体
- 系统字体栈：`-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif`
- **无 web 字体加载**，完全依赖系统字体（零加载成本）
- 字重体系：标题 700-800，正文 400-600；价格数字加大加粗（32px/48px）

### 4.3 颜色体系（核心资产，改版时保留或替换都在这套变量上）
| 用途 | 色值 |
|---|---|
| 主深色（标题/价格/深色卡背景） | `#1a1a2e` |
| 品牌强调橙红（active/热卖/CTA） | `#e17055` |
| 页面背景 | `#f5f6fa` |
| 卡片背景 | `#fff` / `#f8f9fa` |
| 成功绿（免费/勾选√） | `#00b894` |
| 蓝（序号/单品标签） | `#0984e3` |
| 金色（VIP 大价格） | `#fdcb6e` |
| 次要灰文字 | `#636e72` / `#b2bec3` |
| 对比表价格红 | `#e94560` |
| 对比高亮绿（米推兔） | `#16a34a` / `#22c55e` |
| 结论警告红 | `#dc2626` |

### 4.4 卡片
- 圆角 10-16px，`box-shadow: 0 2px 12px rgba(0,0,0,0.04~0.06)` 轻投影
- `.card` 悬停 `transform: translateY(-3px)` 上浮
- `.card.rec` 主推卡加 `2px solid #e17055` 橙红描边
- VIP/尊享卡用 `linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)` 深色渐变
- 伪元素角标：`.vip-wrap::after` 生成"当红爆品"右上角标签

### 4.5 按钮 / 标签
- 没有传统"立即购买"按钮；主 CTA 是 `.case-link a`：白色描边橙红按钮，hover 反转为橙红填充
- 胶囊标签（pill）：`.tagline` `.badge` `.free-item .tag` `.vb` `.card-hd .limit` 等，圆角 10-20px 小字号
- 对比表 `.p-item` 用背景色区分档位：红底 `#fff5f5`、黄底 `#fffbe6`

### 4.6 导航
- `.nav`：白底 sticky 吸顶，`z-index 100`，flex 均分 5 项
- active 态：文字变橙红 `#e17055` + 3px 底部橙色边框
- hover：文字变深 + 浅灰背景
- 移动端 `overflow-x: auto` 可横向滑动

### 4.7 响应式
- **700px 断点**：所有 grid 变 1 列；vip 卡变 column；表格字号缩至 12px、内边距减半
- **640px 断点**：premium-intro 居中变列；contact-bar 变 column、分割线隐藏
- 整体策略：桌面多列 → 移动单列堆叠，无复杂导航折叠（锚点导航直接横滑）

---

## 5. JS 交互分析（共 3 个功能，约 40 行，原生 JS 无依赖）

| # | 功能 | 实现方式 |
|---|---|---|
| 1 | 导航点击切换 active | 监听 click，移除所有 active 再给当前加 |
| 2 | 滚动高亮导航 | `scroll` 事件，遍历 `.section`，`offsetTop - 80` 判断当前 section，同步导航高亮 |
| 3 | 复制微信号/手机号 | 读取 `data-copy` → 动态创建 `<textarea>` → `document.execCommand('copy')`（兼容方案）→ 显示 toast「已复制: xxx」2 秒后淡出 |

无动画库、无请求、无数据交互。交互非常克制，纯前端展示页。

---

## 6. GitHub Pages 部署判断

**✅ 可直接部署，零配置。**

依据：
1. 纯静态 HTML，无后端 / 无 API / 无构建步骤
2. 无相对路径资源依赖（单文件自包含），不存在路径错乱问题
3. 对方仓库就是标准 Pages 部署：`Settings → Pages → Deploy from branch → main / (root)`，push 即生效
4. 可选优化（非必须）：加 `.nojekyll` 文件（本页无下划线文件，不需要）

自己的版本部署路径：新建空仓库 → push `index.html` → Pages 开启 main 分支 → 访问 `https://你的用户名.github.io/仓库名/`

---

## 7. 重建所需文件清单

| 文件 | 必要性 | 作用 |
|---|---|---|
| `index.html` | ✅ 必需 | 页面全部内容（结构+样式+交互），单文件即完整站点 |
| `README.md` | 可选 | 项目说明/部署记录 |
| `favicon.ico` | 可选 | 浏览器标签页图标 |
| `.nojekyll` | 不需要 | 无下划线文件 |

**核心结论：复制 1 个 index.html 即可 100% 完整重建。**

---

## 8. 本阶段已完成的文件

```
D:\新建文件夹 (2)\2026-09-01-15-30-06\price-page\
├── index.html      ← 源码原样副本（md5 与线上一致：0b26262177359e7fd5c1356be4532cee）
└── ANALYSIS.md     ← 本分析报告
```

未修改任何内容，未触碰对方仓库（仅 HTTP 只读请求 + GitHub API 只读查询）。

---

## 9. 下一步修改建议（第二阶段，按优先级）

> ⚠️ 注意：页面文案（"米推兔/兔哥/价格/数据"）是对方品牌与营销信息，重建时须全部替换成自己的品牌，结构/布局/设计风格可参考。

| 优先级 | 修改点 | 位置 |
|---|---|---|
| P0 | 品牌替换：标题"米推兔·求职陪跑"→ 自己的 IP 名 | `.header h1` |
| P0 | 联系方式：微信号/手机号/对接人 → 自己的 | `.contact-bar` + `data-copy` |
| P0 | 案例外链：飞书链接 → 自己的案例集 | `.case-link a` |
| P1 | 服务与价格：单项价格、VIP 1199、私教 2999/3999/2499 → 自己的定价 | `#single` `#vip` `#premium` |
| P1 | 导师人设卡：兔哥(前华为HR)→ 自己的导师背景 | `.premium-intro` |
| P2 | 同行对比表数据：换成真实市场调研（建议重新搜集，勿直接沿用对方表格） | `#compare` |
| P2 | 数据来源声明、统计数字（5000+上岸等）→ 自己可佐证的数据 | `#compare` `.stats-row` |
| 可选 | 字体/配色微调成自己品牌色（当前橙红 `#e17055` + 深蓝 `#1a1a2e` 可保留，辨识度不错） | 全局 |
