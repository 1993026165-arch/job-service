# 求职陪跑价格页 · 可配置架构版

> 由单文件版重构而来：**内容 / 样式 / 交互 三者分离**，视觉与原版 100% 一致（已通过 DOM 逐字节对比验证）。

## 目录结构

```
price-page/
├── index.html       页面骨架（不要动，除非要加模块）
├── admin.html       ★ 可视化内容编辑器（浏览器打开即可用）
├── css/style.css    全部视觉样式（颜色/字体/间距/响应式）
├── js/config.js     ★ 内容配置中心 —— 平时只改这个文件
├── js/app.js        渲染 + 交互逻辑（导航高亮/滚动定位/一键复制）
├── js/admin.js      编辑器逻辑（读取配置→表单→校验→生成下载）
└── README.md        本文档
```

## 怎么用（对运营者）

**方式一：可视化编辑器（推荐）**
直接双击打开 `admin.html`，即可通过表单修改所有内容，点【生成 config.js】下载，替换 `js/config.js` 即可。无需懂代码。

**方式二：直接改 config.js**
改价格 / 改文案 / 改联系方式 → 只改 `js/config.js`，其他文件不要碰。

示例：

| 想改什么 | 去 config.js 里找 | 改成 |
|---|---|---|
| 品牌名 | `brand.title: '米推兔'` | 你的品牌名 |
| VIP 价格 | `vip.price: '1199'` | 你的价格 |
| 微信号 | `contact.items` 里 `value: 'tuge_vip'` | 你的微信号 |
| 加一个服务 | `single.items` 里复制一行 `{ num: 8, name: '...', price: '...' }` | 新内容 |
| 删一个服务 | 删掉对应一行 | — |

config.js 里每一行都写了注释，照着抄即可。

**改视觉（颜色/字体/圆角）→ 改 `css/style.css`。**
主色参考：品牌橙红 `#e17055`、深蓝 `#1a1a2e`、金色 `#fdcb6e`。

## 可视化编辑器（admin.html）

```
打开 admin.html → 表单修改 → 点【生成 config.js】→ 浏览器下载 → 替换 js/config.js → 刷新正式网页
```

支持：
- 全部内容字段编辑（品牌/导航/免费/单项/VIP/私教/同行对比/联系栏/底部文案）
- 数组项 新增 / 删除 / 修改（服务项、权益清单、价格项等）
- 生成前自动校验（必填项、价格、URL 格式、JS 语法）
- 【恢复当前配置】：撤销本次编辑，恢复为打开页面时的配置
- 【预览当前网页】：新窗口打开正式网页看效果
- 双击 admin.html 即可用，无需启动服务器（file:// 环境可用）

## 架构说明

```
index.html ──引入──> css/style.css（UI）
index.html ──引入──> js/config.js（内容数据）──读取──> js/app.js（渲染）
```

- 页面所有文字、价格、链接都集中在 `js/config.js` 一个对象里（`window.PRICE_CONFIG`）
- `js/app.js` 读取配置，按模板渲染成与原始页面完全相同的 DOM，并绑定交互
- 增删服务、改价格不需要懂代码

## 验证记录

改造后页面与原单文件版进行 DOM 对比：
- 标签结构、class、属性、文本内容：**逐字节一致**
- CSS：原样提取，一字未改
- 结论：视觉 100% 不变

## 部署到 GitHub Pages（已上线）

**线上地址**：https://1993026165-arch.github.io/job-service/
**代码仓库**：https://github.com/1993026165-arch/job-service （Pages 已配置：main 分支根目录，push 即自动更新，约 1 分钟生效）

### 一键发布（推荐）

```
WorkBuddy 启动本地发布服务（tools/publish-server.js，仅监听 127.0.0.1:8899）
→ 打开 admin.html → 修改内容 → 点【🚀 发布到网站】
→ 本地服务自动：备份 config.js → 写入新配置 → git add/commit/push → 查 Pages 状态
→ 约 1 分钟后线上更新
```

- 无需手动替换文件、无需手动敲 Git 命令
- 顶部状态条显示「发布服务：已连接 / 未连接」；未连接时自动降级为下载 config.js 备用
- 服务端二次校验（语法 + 必填字段），失败自动回滚备份，不影响线上
- 凭据由 GitHub CLI（gh）在系统安全区托管，全程无 Token 暴露

### 手动发布（备用）

1. `admin.html` 点【⬇ 保存 config.js】下载
2. 用下载文件替换 `js/config.js`
3. WorkBuddy 中发送「发布到网站」由助手推送

### 本地发布服务启动方式（由 WorkBuddy 执行）

```
node tools/publish-server.js
环境变量：PORT(默认8899) / WORK_DIR(默认项目目录) / DRY_RUN=1(测试模式不推送) / GH_PATH
```

> 服务仅监听 127.0.0.1；只允许写固定的 js/config.js，无任意命令执行接口。

## 注意事项

- 页面当前文案（"米推兔/兔哥/价格/数据"）为参考来源的营销内容，上线前请全部替换为自己的品牌信息
- 联系方式 `data-copy` 值（微信号/手机号）记得改成自己的
