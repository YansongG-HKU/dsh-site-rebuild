# 网站复刻 · dsh-site-rebuild

![Node >= 22](https://img.shields.io/badge/node-%3E%3D22-3c873a) ![License MIT](https://img.shields.io/badge/license-MIT-blue)

> **看懂任何网站，记录证据，做一个自己的版本，并用同一把尺子校验。**
> 网站复刻工作流（Study → Brief → Build → Check → Ready）的 DSH 原生实现：纯 Node、零运行时第三方依赖、自写 CDP 浏览器驱动 / PNG 编解码 / 像素差 / SSIM / 设计令牌提取，一个共享浏览器进程，六个智能体工具 + 一个侧边栏面板。

- 仓库：<https://github.com/YansongG-HKU/dsh-site-rebuild>
- 插件包：`dsh-site-rebuild` v0.2.2（MIT）
- 面板：左侧栏「网站复刻」（order 27；若被插件图标管理隐藏，可在「更多 → 插件图标」里点「显示」）
- 工具：`craft_study` · `craft_brief` · `craft_check` · `craft_projects` · `craft_evidence` · `craft_serve`
- 数据目录：`%DSH_HOME%/site-rebuild`（可用 `dataDir` 覆盖）
- 安装：见 [§7 安装与配置](#7-安装与配置)

## 1. 工作流

```
craft_study(url, request)      研究：三档视口截图 + 计算样式 / 布局 / 断点 / 页面结构 / 健康
        ↓  产物 capture/（截图、噪声掩膜、page.json、README.md、evidence.json）
craft_brief(projectId)         交接：精确设计值 + 结构 + 断点 + 原创性规则 + 验收标准（≤48 KiB）
        ↓  agent 在项目 app/ 目录写重建版本（index.html 或 dist/ build/ out/）
craft_check(projectId)         校验：同浏览器、同视口重新拍摄，四层指标 + 差异清单 + 差异图
        ↓  按差异修 → 再校验，直到 ≥ 90
面板「网站复刻」               项目列表 / 四步状态 / 截图 / 设计令牌 / 证据 / 简报 / 校验轮次
```

## 2. 工具

| 工具 | 作用 | 关键参数 |
| --- | --- | --- |
| `craft_study` | 新建项目并研究目标网站，写证据 | `url`, `request`, `mode: clean/deep`, `width[]`, `maxPages`（额外页数）, `projectId`（重研） |
| `craft_brief` | 生成/读取建造简报 | `projectId` |
| `craft_check` | 服务重建版本（或外部 URL）、拍摄、比较、写轮次 | `projectId`, `url?`, `appDir?` |
| `craft_projects` | 项目列表 / 详情 / 删除 | `action: list/get/delete`, `projectId` |
| `craft_evidence` | 分页浏览证据（置信度/覆盖/局限/位置） | `projectId`, `offset`, `limit`, `kind` |
| `craft_serve` | 启动/复用重建版本本地预览（loopback 静态服务） | `projectId` |

所有工具都返回结构化 JSON，失败返回 `{ok:false, code, error, repair:{action,label,detail}}`；不向模型抛异常。

## 3. 捕获了什么

每个页面每档视口（默认 1440 / 768 / 375）：

- `screenshot-<w>.png` 全页截图；`noise-<w>.png` 自变化区域掩膜（两次拍摄差异 + video/canvas/iframe 矩形）
- `page.json`：可见文本、标题大纲、链接、表单、图片与资源清单、a11y 地标、控制台/网络健康
- `design`：规范化十六进制配色（背景/文字/描边）、字体族、字号/字重/行高、间距、圆角、阴影、CSS 变量
- `layouts`：页面尺寸、h1/h2/正文尺寸、区块 padding / 每行个数 / 内容列宽
- `css.breakpoints`：媒体查询数值；`dynamic`：动画/视频/iframe/懒加载统计
- 净室默认只读“访客可见内容”；`mode: "deep"` 额外保存渲染 HTML
- 关键参数：单页高度上限 12000px、节点 2500/页、证据单条 512 KiB、项目 200 个

## 4. 评分模型（0–100）

每档视口：

```
score = (0.40 · layout + 0.40 · detail + 0.20 · token) × (1 − 0.25 · 高度差比)
layout = 色块网格（12×8/band，320px 比较画布）平均颜色相似度
detail = 亮度 8×8 块 SSIM
token  = 设计语言相似度（配色 55% + 字体族 25% + 字号 20%）
```

页面分按视口加权（1440:0.45 / 768:0.30 / 375:0.25）；项目分取页面平均。等级 S≥97 / A≥90 / B≥80 / C≥65 / D≥45 / E<45；总分 ≥90 记为 `ready`。

不计入分数但驱动修复的差异：文本 Dice（CJK 按二字组）+ 缺失标题/词、结构 LCS（地标/标题/列表/控件顺序）、设计值缺失（颜色/字体/字号/间距/区块 padding·每行·列宽）、健康回归（新增控制台错误/失败请求）、claims（不横向滚动、无新错误、地标齐全）。
自变化区域在两次拍摄间被掩膜排除，不惩罚“轮播/时钟/视频”。

## 5. 性能（本机实测，`node test/perf/bench.mjs`）

| 指标 | 实测 |
| --- | --- |
| PNG 解码 1440×900 | **15.2 ms** |
| 像素差 + 布局 + SSIM（1440×900，含区域定位） | **20.4 ms** |
| 同上（相同图，最坏路径） | 26.9 ms |
| 真实截图解码（1440×962，74 KB） | 34.9 ms |
| 真实截图比较（1440×962） | 74 ms |
| 三档视口捕获（浏览器冷启动含内） | 6.33 s |
| 三档视口捕获（浏览器复用，含噪声二次拍摄） | 5.48 s（约 **1.83 s/视口**） |

集成测试中 2 页 ×3 视口：研究 10.4 s、校验 10.1 s；线上 3 页 ×3 视口：研究 14.4 s、校验 16–21 s（含 3 页服务的启动、9 组截图 + 两层指标）。
差距主要在浏览器导航/懒加载预热/两次截图，不在比较引擎；共享浏览器进程与隔离 context 已把冷启动摊薄。

## 6. 净室与原创性

- 净室（默认）：不读取原站源码/脚本；只用截图、可见文本、计算样式与布局测量。深潜模式才保存渲染 HTML。
- 简报明确要求：不下载/复制原站 logo、照片、插画、视频、字体文件与文案；用 CSS/SVG 占位资产与自己写的等价文案。
- 不绕过登录、付费墙、反爬或 DRM；不请求原站私有接口。
- 面板路由仅回环 + 自定义头 + 同源校验；项目文件读取限制在项目目录内（`..` 已测 404）。

## 7. 安装与配置

```powershell
git clone https://github.com/YansongG-HKU/dsh-site-rebuild.git
```

在 DSH 会话里由 agent 安装（把 `<path-to>` 换成克隆目录；本机开发可直接指向工作区里的插件目录）：

```powershell
plugin_manager({ action: "install_bundle", target: "<path-to>/dsh-site-rebuild" })
```

> 替换已安装包的 JS 需要重启桌面版 DSH 才会加载新模块（Host ESM 有进程级缓存；link 安装指向源码目录）。

`cordis.patch.yml` 默认配置：

```yaml
config:
  widths: [1440, 768, 375]
  maxPages: 3        # 总页数（起始页 + 最多 2 个同源子页）
  openStates: false
```

可选配置：`dataDir`、`browserPath`、`blockedHosts[]`、`includeDiffImages`、`cleanRoom`。浏览器查找顺序：config → `SITE_REBUILD_BROWSER` → Chrome/Edge 常见路径。
面板 API（同源、需 `x-dsh-site-rebuild: 1`）：`/dsh-site-rebuild/api/...`；图片文件路由只要求 loopback Host（`<img>` 无法带自定义头）。

## 8. 测试

```powershell
cd <path-to>/dsh-site-rebuild
node --test test/unit/*.test.mjs        # 52 项单元测试
node --test test/integration/*.test.mjs # 真实 Chrome/Edge + 本地站点全链路
node test/perf/bench.mjs                # 性能基准（预算：比较 <250ms，捕获 <2s/视口）
node scripts/build-client.mjs           # 由 src/client/*.js 片段重建 client.js
node scripts/build-client.mjs --check   # 校验 client.js 与片段一致
```

- 单元：PNG 编解码（5 种滤波/灰度/错误输入）、像素差/掩膜/SSIM/文本/结构/设计/health/claims/token/聚合、设计令牌与断点、store 原子写与并发锁、面板门禁/路由/body 上限、brief、工具契约、client 模块/字典/槽位注册。
- 集成：本地 fixture 站（3 页、CSS 断点、懒加载、自变化时钟）→ 研究 2 页 ×3 视口 → 证据 15 条 → 简报 → 写克隆 → 校验 100/S → 退化克隆 61.9 分 → 状态/预览/历史断言。连续 3 次通过。
- 线上验收与限制见 [docs/VERIFICATION.md](docs/VERIFICATION.md)。

## 9. 目录结构

```
dsh-site-rebuild/
  index.js                  Host 入口：store/service/工具/面板/提示词段
  lib/
    config.js util.js       预算、默认配置、原子写
    store.js evidence.js    项目库、证据模型与分页
    browser.js cdp.js ws.js 浏览器进程池、CDP 客户端、最小 WebSocket
    capture.js extract.js   捕获流水线、注入页面的提取脚本
    tokens.js               设计令牌 / 布局 / 断点 / README 合成
    diff.js                 PNG 无关的感知比较与差异清单
    png.js                  PNG 8-bit 解码/编码（zlib）
    brief.js jobs.js        建造简报、任务队列
    preview.js panel.js     静态预览服务、同源面板路由
    service.js tools.js     研究/校验编排、六个工具
  src/client/*.js           面板源码（5 个片段，构建为 client.js）
  test/unit|integration|perf|fixtures
  docs/DESIGN.md docs/VERIFICATION.md
  locale/zh.json locale/en.json icon.svg cordis.patch.yml
```

## 10. 已知局限

- 跨域 iframe 内部、关闭的 Shadow DOM、canvas 像素内容不提取；单页高度超过 12000px 会被截断。
- 自变化区域只用“两次截图差异 + 媒体矩形”识别；慢于两次拍摄间隔的动画可能漏掩膜（简报会标注）。
- 纯数字动态文本（时钟/计数器）仍会轻微影响文本相似度。
- 只比较同一组页面路径；重建若改动路由，需要保持相同路径或显式传 URL 校验。
- 视觉验收依赖桌面窗口（GUI 外部浏览器需要自身 token URL）；本机 Playwright 浏览器访问返回 401，面板视觉截图未采集，已用槽位注册 + 面板 API + client 单测覆盖（见 VERIFICATION）。
- 仅 Windows 做了完整验证（浏览器查找/预览服务/Explorer 打开按 Windows 路径实现，其他平台走 fallback）。

## 11. 致谢与许可

- 工作流与“证据即结果 / 净室 vs 深潜 / 噪声掩膜 / 相似度”思路参考 [Craft Anything 概念](https://github.com/storytold/craft-anything)（MIT OR Apache-2.0）。本插件为独立 Node 实现，未复制其 Rust 代码、schema、文案或资产。
- 感知像素差采用公开的 YIQ 加权思路（pixelmatch 等同类工具的做法）；SSIM 为公开算法。其余代码原创。
- 许可证 [MIT](LICENSE)；变更历史见 [CHANGELOG.md](CHANGELOG.md)。
