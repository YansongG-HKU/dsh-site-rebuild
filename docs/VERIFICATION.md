# dsh-site-rebuild · 验收记录（VERIFICATION）

> 验收基线：v0.1.0（2026-11-07，当时安装名与本文档同名包）。v0.2.0 更名为 `dsh-site-rebuild`（中文「网站复刻」）并首次公开发布到 GitHub，只改名称 / 路由前缀 / 数据目录 / 文档，功能、数据格式与评分模型未变；改名后的自动化复测见 §4。

验收时间：2026-11-07 03:44–04:00（Asia/Shanghai）
宿主机：Windows，DSH 桌面版 0.2.2-rc.1 profile `desktop`，Node v24.14.1，Chrome（`C:\Program Files\Google\Chrome\Application\chrome.exe`）

## 1. 安装

```json
{"stage":"enable","target":"dsh-site-rebuild","enabled":true,"changed":true,"application":"applied","bundle":"dsh-site-rebuild","version":"0.2.0","warnings":[]}
```

- profile 依赖：`dsh-site-rebuild: link:<workspace>/dsh-site-rebuild`
- 插件行：`- id: dsh-site-rebuild  name: dsh-site-rebuild`（`cordis.patch.yml`）
- 重启桌面版 DSH 后 Host 加载为最终代码：`craft_check` 已返回设计差异字段（仅新代码有），证明重启加载生效。

## 2. 活体工具验收（真实 Chrome + 本地 fixture 站 http://127.0.0.1:57316）

| 步骤 | 调用 | 结果 |
| --- | --- | --- |
| 研究 | `craft_study(url, request, name, stack)` | `ok:true`，project `craft-20261106-194427-eeef`，3 页，1440/768/375，断点 `[520,900]`，证据 15 条，**14.4 s**（第一次 15.6 s） |
| 简报 | `craft_brief(projectId)` | `ok:true`，**8,551 bytes**，含精确配色 `#f6f1e7/#0f6b5c`、字号 `44px`、断点、区块测量、净室规则、验收目标，写入 `capture/BRIEF.md` |
| 校验（同源克隆） | `craft_check(projectId)` | **100 分 / S**，3 页 ×3 视口全 100，`failedClaims: []`，`unknowns: []`，**16.3 s** |
| 校验（退化克隆：换品牌色/纸色、删 showcase、删 hero） | 再 `craft_check` | **93.3 分 / A**（`/` 89.8，`/work` 95，`/about` 95），生成 9 张差异图 `checks/round-3/diff-*.png`；`text.similarity 91.7`、`design` 列出缺失色/字号/间距、`topRegions` 指向头部换色区 |
| 项目列表/详情/证据 | `craft_projects` / 面板 API | 项目持久化，`status: ready`，`bestScore: 100`，`checks` 4 轮，证据分页正常 |
| 恢复同源克隆再校验 | 第 4 轮 `craft_check` | **100 分 / S**（3 页全部 100/100/99.9），**17.4 s**，无失败 claim/unknown；最终状态 `ready`、`bestScore 100`，面板 API 读出 `checks 4 / last 100` |

活体数据目录：`%DSH_HOME%/site-rebuild/projects/craft-20261106-194427-eeef`
（`capture/` 10 文件、`checks/round-1..3/`、`app/` 6 文件、`build/` 24 文件；`craft.json` schemaVersion=1）

证据图片（真实产物，非 mock，路径为当时工作区布局）：
- 原始截图：`<workspace>/_artifacts/site-rebuild/capture-original-1440.png`
- 差异图（1440）：`<workspace>/_artifacts/site-rebuild/diff-degraded-1440.png`（红色=差异；头部换色、文字、缺失区块可见）
- 差异图（375）：`<workspace>/_artifacts/site-rebuild/diff-degraded-375.png`

## 3. 面板验收

| 检查 | 结果 |
| --- | --- |
| Client 槽位注册 | `cordis_inspect_query(client Slots, root=sidebar.panellist)`：`dsh-site-rebuild`，registrant `tk`，order 27，`active: true` |
| `main` 面板注册 | 同一次查询可见两个注册（`sidebar.panellist` + `main` key `dsh-site-rebuild`），见 client 单测；进程重启后仍 active |
| 面板 API `GET /api/state` | `200`，返回 `browser.available true`、`config.widths [1440,768,375]`、项目列表 |
| 面板 API `GET /api/projects/:id` | `200`，`capture.pages 3`、`tokens.design.backgrounds 6`、`evidence.total 15`、`checks 4`、`job.status done`、`status ready`、`bestScore 100` |
| 面板 API `GET /api/projects/:id/evidence` | `200`，`total 15`，分页返回 3 条 |
| 面板文件 `GET .../file?path=capture/screenshot-1440.png`（无自定义头） | `200`，`image/png`，**74,380 bytes**（`<img>` 用路由） |
| 面板文件 `GET .../file?path=checks/round-3/diff-1440.png`（无自定义头） | `200`，`image/png`，**44,999 bytes** |
| 路径穿越 `file?path=..%2F..%2Fcraft.json` | **404**（`safeFile` 拒绝） |
| 未授权 JSON 请求（缺 `x-dsh-site-rebuild`） | `403`（单测覆盖 gate） |
| 视觉截图 | **未采集**：桌面 GUI 的 Web 地址对外部浏览器需要它自己打印的 token URL，Playwright 独立浏览器访问 `/` 返回 `401`；按验收规范不做 token 搜索/不启动替代浏览器。已用槽位注册 + 面板接口 + client 模块单测（字典键一致、apply 注册、helpers）覆盖功能，视觉效果留待窗口内人工确认 |

> 说明：桌面窗口左侧栏的「网站复刻」入口受「更多 → 插件图标」管理（当时 1/10 显示，用户可点「显示」固定到侧栏）。宿主重启后此前 pinned 的图标集合可能变化，这是 DSH 自己的面板图标管理行为，不是插件缺失；槽位注册与面板 API 均正常。

## 4. 自动化测试

v0.2.0 改名后（Node v24.22.2）：

```
node --test test/unit/*.test.mjs        → tests 52, pass 52, fail 0
node --test test/integration/*.test.mjs → tests 1,  pass 1,  fail 0 (≈38 s，真实 Chrome)
node --check index.js                   → OK
node scripts/build-client.mjs           → wrote client.js from 5 fragments
node scripts/build-client.mjs --check   → client.js is up to date
```

集成测试改名后输出：`identical 100 · degraded 61.9`，三视口分解与基线一致。

v0.1.0 验收基线：

```
node --test test/unit/*.test.mjs        → tests 51, pass 51, fail 0 (≈1.2 s)
node --test test/integration/*.test.mjs → tests 1,  pass 1,  fail 0 (≈32–36 s)，连续 3 次通过
```

集成测试覆盖：本地 fixture 站（3 页、CSS 断点、懒加载、自变化时钟）→ 研究（`maxPages: 2`：起始页 + `/work`）→ 3 视口截图与 `page.json` 尺寸断言 → 噪声掩膜（时钟区域 `maskedPixels > 0`）→ 断点 `[520,900]` → 证据 10 类 15 条 → README/BRIEF 内容 → 复制同源克隆 → 校验 **100/S**（无失败 claim/unknown）→ 退化克隆（换色/换字体/删 hero+showcase）→ **61.9 分** → 项目状态/最佳分/2 轮 checks/预览服务 200。

稳定性说明：一次并行运行（同时有活体校验占用 Chrome）曾出现失败；将 fixture 时钟改为毫秒精度后连续 3 次通过。测试与活体验收同时跑时仍可能因资源竞争抖动，单独运行稳定。

## 5. 性能

`node test/perf/bench.mjs`（v0.1.0 最终一次）：

```
decode 1440×900   15.2 ms
compare 1440×900  20.4 ms  (score 97.8, 2 regions)
identical compare 26.9 ms
cold capture      6330 ms  (browser launch + 3 viewports)
warm capture      5475 ms  (1825 ms/viewport)
decode screenshot 34.9 ms  (74,480 bytes, 962px tall)
real compare      74 ms
budget {"compareUnder250ms":true,"warmCaptureUnder2sPerWidth":true}
```

预算：比较引擎 <250 ms（实测 20–74 ms，视是否带掩膜/真实截图）；捕获 <2 s/视口（实测 1.83 s）。浏览器进程复用（隔离 BrowserContext）+ 稀疏采样降采样（2×2/格）把 1440×900 比较从初版 97 ms 降到 20 ms。

## 6. 未验证 / 限制

- 面板视觉截图（见上，401）。
- macOS/Linux：浏览器查找/预览/Explorer 打开仅 Windows 实测；其余按路径 fallback，未跑。
- 深潜模式：渲染 HTML 已实现并有代码路径，但同一轮未用公开站点做深潜活体验收。
- 跨域 iframe/Shadow DOM/canvas 内容、>12000px 页面截断、慢动画漏掩膜：已在 README 列为局限。
- 面板图标 pinned 集合由 DSH 图标管理控制，重启后可能回到 1/10 显示状态。
