# 变更日志（Changelog）

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.2.0] — 2026-11-07

更名与首次公开发布：造物 / `dsh-craft-anything` → 网站复刻 / `dsh-site-rebuild`。

### 更名

- 插件包名、cordis 插件行 `id`/`name`、client 模块 id、locale 命名空间 → `dsh-site-rebuild`。
- 面板路由前缀 `/dsh-craft-anything` → `/dsh-site-rebuild`；请求头 `x-dsh-craft-anything` → `x-dsh-site-rebuild`；语言缓存键同步。
- 中文名「造物」→「网站复刻」，英文名「Craft Anything」→「Site Rebuild」：locale `zh/en`、面板标题与侧边栏标签、系统提示词段、tool 描述、图标 `aria-label` 同步。
- 数据目录默认值 `%DSH_HOME%/craft-anything` → `%DSH_HOME%/site-rebuild`（可用 `dataDir` 覆盖）。
- 浏览器环境变量 `CRAFT_ANYTHING_BROWSER` → `SITE_REBUILD_BROWSER`；临时目录前缀、日志前缀、effect 标签同步。
- README / docs 重写：去掉本机绝对路径，补充公开仓库信息与安装方式；新增本文件、`LICENSE`（MIT）与 `.gitignore`。

### 保持稳定（未改名）

- 工具名 `craft_study` / `craft_brief` / `craft_check` / `craft_projects` / `craft_evidence` / `craft_serve`。
- 项目记录文件名 `craft.json` 与项目 id 前缀 `craft-`（schemaVersion=1 未变）。
- 功能、评分模型、限额、面板交互均未变。

### 发布

- 仓库：<https://github.com/YansongG-HKU/dsh-site-rebuild>（public，首次发布）。
- 校验：`node --test test/unit/*.test.mjs` 51/51 通过；`node --check index.js`；`node scripts/build-client.mjs --check`；集成测试见 docs/VERIFICATION.md。

## [0.1.0] — 2026-11-06

- 首个内部版本：研究 → 简报 → 建造 → 校验 → 可用 工作流；六个智能体工具 + 侧边栏面板；纯 Node CDP / PNG / 像素差 / SSIM / 设计令牌实现。
