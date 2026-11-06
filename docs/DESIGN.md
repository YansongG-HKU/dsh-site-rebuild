# dsh-site-rebuild · 设计（v1）

目标：把 Site Rebuild 的 **Study → Build → Check → Ready** 带到 DSH：原生 Host 工具 + 侧边栏面板，纯 Node、零运行时依赖、可测试、性能优先。

## 借鉴来源（集百家之长）

| 来源 | 吸收什么 |
| --- | --- |
| [Craft Anything 概念](https://github.com/storytold/craft-anything)（MIT/Apache-2.0，只借鉴思路与数据形态，不复制代码/文案） | 证据记录（confidence/coverage/limitations/locations）、净室 vs 深潜、三档宽度、噪声掩膜、design tokens + layouts + blocks + outline、文本 Dice / 结构 LCS / 设计值差异 / health 差异、SSIM+色块布局双指标、Build Brief 结构、项目目录 |
| Chrome DevTools Protocol / Playwright 实践 | 单浏览器进程复用、隔离 BrowserContext、资源阻断、settle 启发式、full-page 截图（captureBeyondViewport + clip） |
| pixelmatch / SSIM | YIQ 感知差、抗锯齿容忍、噪声掩膜忽略、8×8 块 SSIM |
| Design2Code 类基准 | 分块位置/尺寸/颜色/文本匹配、文本相似度、位置相似度、聚合加权 |
| 站点归档实践（SingleFile / monolith / wget 思路） | 同源路由挑选、资源清单、字体与 CSS 断点、懒加载滚动预热 |
| DSH 现有插件（purge-plus / expert-council / plugin-smith） | 同源 JSON 面板路由、工具注册、模块客户端格式、client 片段构建 |

## 架构

```
index.js                 Host 入口：store/service、6 个 craft_* 工具、面板路由、提示词段
lib/
  config.js  util.js    限额、默认配置、原子写、id、哈希
  store.js              项目库：<DSH_HOME>/site-rebuild/projects/<id>/{craft.json,capture/,app/,checks/}
  evidence.js           证据记录 + 分页
  png.js                PNG 8-bit 解码/编码（zlib，无第三方）
  diff.js               像素差/SSIM/色块布局/文本/结构/设计/health/claims/聚合分
  tokens.js             从 DOM 节点聚合 design tokens、断点、blocks
  extract.js            注入页面的提取脚本（结构、样式、a11y、forms、assets、断点）
  cdp.js                CDP 客户端（WebSocket，id/事件/session）
  browser.js            Chrome/Edge 发现、进程复用、BrowserContext 生命周期
  capture.js            三档视口捕获、懒加载预热、噪声二次拍摄、路由页
  brief.js              建造简报（净室规则、精确 token、验收标准）
  jobs.js               进程内任务队列（面板轮询）
  preview.js            本地静态预览服务器（校验 app/ 用）
  panel.js              同源 JSON 路由 + 项目文件字节流
  service.js            编排：study / check / project ops
  tools.js              craft_* 工具定义
src/client/*.js         面板源码（片段拼接为 client.js）
scripts/build-client.mjs
test/unit|integration  node:test；真实 Chrome 集成测试 + 性能基准
```

## 数据形态

`craft.json`（schemaVersion=1）：
```
id name createdAt updatedAt target{url,origin,host,path} request mode stack status
steps{study,build,check,ready} capture{widths,pages,summary,tokensHash,studiedAt,durationMs,limitations}
checks[{round,at,score,perWidth[{width,score,layout,detail,pageH}],notes[],claims[],unknowns[],dir,durationMs}]
```

每个宽度捕获：`screenshot-<w>.png`、`noise-<w>.png`、`capture.json`（nodes、design、layouts、blocks、outline、text、headings、links、forms、assets、a11y、health、breakpoints）。

## 评分（0–100）

- 每宽度：score = (0.40·layout + 0.40·detail + 0.20·token) × 高度惩罚
  - layout：色块网格平均色差相似度
  - detail：亮度 8×8 块 SSIM
  - token：设计语言（配色 55% + 字体族 25% + 字号 20%）
  - 高度差惩罚最多 25%；噪声掩膜像素忽略
- 页面分：视口加权 1440:0.45 / 768:0.30 / 375:0.25
- 附带不计入分但驱动修复：文本 Dice、结构 LCS、设计值缺失、块 padding/per_row/column、health 新增错误/失败请求、claims（不横向滚动、无新错误、landmarks）

## 安全与边界

- 净室模式：只读“访客可见”的内容（截图、可见文本、计算样式、布局、资源 URL），不读站点源码/JS；深潜模式才拉取 JS/HTML 源码。
- 原创性：简报明确禁止复制 logo/照片/文案；用户未声明拥有时用占位资产与自写文案。
- 面板路由仅回环 + 自定义头 + 同源校验；项目文件读取限制在项目目录内。
- 浏览器进程空闲 TTL 回收；任务超时/取消即杀进程组。

## 性能预算

- 浏览器冷启动 <1.5s；同浏览器第二次捕获 <1.2s/页；三档 <3s（本地站点）
- 1440×900 PNG 解码 + 像素差 + SSIM < 250ms
- 面板轮询 1.2s、增量渲染；项目列表读 craft.json 不读截图
- 全程内存上限：截图高度截断 12000px、节点上限 4000、证据 ≤ 2MB/项目

## 测试

- 单元：png 编解码、diff 正确性、tokens、brief、store 原子性、url 路由、面板门禁
- 集成：本地 fixture 站点 + 真实 Chrome，三档捕获、两次捕获噪声掩膜、克隆站点校验评分、性能基准
- 安装后：cordis_inspect Tool 列表出现 craft_*；Playwright 截图面板；真实工具调用
