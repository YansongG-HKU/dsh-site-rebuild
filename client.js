window.__ModuleLoader__.load({
  id: "dsh-site-rebuild",
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" })

    const react = require("react")
    const h = react.createElement
    const { useState, useEffect, useRef, useCallback, useMemo } = react

    const NS = "dsh-site-rebuild"
    const API_BASE = "/dsh-site-rebuild"
    const REQ_HEADER = "x-dsh-site-rebuild"
    const VERSION = "0.2.0"
    const LANG_KEY = "dsh-site-rebuild.lang"
    const ACCENT = "#0f6b5c"
    const ACCENT_DARK = "#4fd1b5"
    const GOLD = "#d99a2b"

    const DICTIONARIES = {
      zh: {
        panel: "网站复刻",
        appTitle: "网站复刻",
        appSubtitle: "看懂任何网站，做自己的版本",
        tagline: "研究 · 简报 · 建造 · 校验",
        loading: "加载中…",
        refresh: "刷新",
        retry: "重试",
        error: "出错了",
        save: "保存",
        cancel: "取消",
        close: "关闭",
        delete: "删除",
        confirmDelete: "确定删除这个项目？截图与记录会一起删除。",
        create: "开始研究",
        creating: "创建项目中…",
        newProject: "新项目",
        targetUrl: "目标网址",
        targetUrlHint: "https://example.com —— 只捕获访客可见内容",
        request: "你想要什么",
        requestHint: "例如：复刻这个首页，用 React 写成我的产品落地页",
        stack: "技术栈（可选）",
        stackHint: "例如：React + Vite / 纯 HTML + CSS",
        name: "项目名（可选）",
        mode: "模式",
        modeClean: "净室",
        modeCleanHint: "只看截图、可见文本与计算样式，不读源码",
        modeDeep: "深潜",
        modeDeepHint: "额外保存渲染 HTML，供理解结构",
        overview: "项目",
        noProjects: "还没有项目",
        noProjectsHint: "填一个网址，研究它的布局、颜色、字体与断点，然后让 agent 在 app/ 里写一版自己的。",
        stepStudy: "研究",
        stepBuild: "建造",
        stepCheck: "校验",
        stepReady: "可用",
        stepPending: "待开始",
        stepRunning: "进行中",
        stepDone: "已完成",
        stepFailed: "失败",
        study: "研究目标",
        restudy: "重新研究",
        check: "校验重建",
        checking: "校验中…",
        briefBtn: "生成简报",
        briefRefresh: "刷新简报",
        openFolder: "打开文件夹",
        preview: "预览构建",
        brief: "建造简报",
        briefHint: "给 agent 的交接文档：精确测量值、结构、断点、原创性规则与验收标准。",
        briefEmpty: "还没有简报。研究后点「生成简报」。",
        copy: "复制",
        copied: "已复制",
        screenshots: "原始截图",
        screenshotsHint: "三档视口；白色区域是自变化区域的噪声掩膜范围。",
        page: "页面",
        width: "宽度",
        colors: "颜色",
        backgrounds: "背景",
        textColors: "文字",
        typography: "字体与字号",
        spacing: "间距 / 圆角",
        breakpoints: "断点",
        evidence: "证据",
        evidenceHint: "每条证据带置信度、覆盖范围与局限。",
        evidenceEmpty: "还没有证据记录。",
        confidence: "置信度",
        limitations: "局限",
        coverage: "覆盖",
        checks: "校验记录",
        checksHint: "每轮校验的总分、每档宽度分与差异清单。",
        checksEmpty: "还没有校验。先把重建版本写进 app/，再点「校验重建」。",
        round: "第 {n} 轮",
        score: "总分",
        layout: "布局",
        detail: "细节",
        token: "设计语言",
        diffImages: "差异图",
        failedClaims: "未通过项",
        unknowns: "未比较",
        notes: "差异摘要",
        designDiffs: "设计差异",
        textDiffs: "文本差异",
        structureDiffs: "结构差异",
        regions: "主要差异区域",
        capture: "捕获信息",
        createdAt: "创建于",
        updatedAt: "更新于",
        pages: "页面",
        duration: "耗时",
        limitationsBox: "研究局限",
        jobRunning: "任务进行中",
        jobFailed: "任务失败",
        jobDone: "完成",
        cancelJob: "取消任务",
        jobPhase: "阶段",
        statusDraft: "草稿",
        statusStudied: "已研究",
        statusChecked: "已校验",
        statusReady: "可用",
        statusBuilding: "建造中",
        emptyProjectsTitle: "从任意网站开始",
        emptyProjectsBody: "研究 → 简报 → 建造 → 校验。研究记录截图与测量值，校验会给出 0–100 的相似度分和要修的地方。",
        addFirst: "研究第一个网站",
        back: "返回项目列表",
        noBrowser: "没有找到 Chrome 或 Edge，研究/校验不可用。安装浏览器或设置 browserPath 后重启。",
        mode: "模式",
        stackLabel: "技术栈",
        pagesCount: "{n} 个页面",
        widthsLabel: "视口",
        appSize: "构建体积",
        best: "最佳",
        latest: "最近",
        open: "打开",
        showMore: "展开",
        showLess: "收起",
        overviewTab: "项目",
        evidenceTab: "证据",
        briefTab: "简报",
        checksTab: "校验",
        settingsHint: "插件数据目录",
        browser: "浏览器",
        diagnostics: "诊断",
        unknownError: "请求失败",
        appMissing: "app/ 里还没有可服务的内容（index.html，或 dist/ / build/ / out/）。",
        refreshDone: "已刷新",
        chars: "字符",
        evidenceCount: "{n} 条",
        readyHint: "总分 ≥ 90 视为可用；继续按未通过项与差异区域修正。",
        scoreLabel: "相似度",
        grade: "等级",
        jobQueued: "任务已在后台运行",
        newProjectTitle: "建立项目",
        projectNamePlaceholder: "我的重建版本",
        targetPlaceholder: "https://example.com",
        requestPlaceholder: "复刻这个页面：保留布局、配色和字体感受，文案换成我自己的",
        stackPlaceholder: "React + Vite（留空则由建造者决定）",
        modeExplanation: "净室模式不读原始站点源码；深潜模式只在你确认拥有或获授权时使用。",
        deleteProject: "删除项目",
        openImage: "新窗口打开",
        noWidths: "没有捕获数据",
        copyBrief: "复制简报",
        regenerate: "重新生成",
        done: "完成",
        running: "运行中",
        failed: "失败",
        cancelled: "已取消",
      },
      en: {
        panel: "Site",
        appTitle: "Site Rebuild",
        appSubtitle: "Study any website, then build your own",
        tagline: "Study · Brief · Build · Check",
        loading: "Loading…",
        refresh: "Refresh",
        retry: "Retry",
        error: "Something went wrong",
        save: "Save",
        cancel: "Cancel",
        close: "Close",
        delete: "Delete",
        confirmDelete: "Delete this project and all its captures and checks?",
        create: "Start study",
        creating: "Creating project…",
        newProject: "New project",
        targetUrl: "Target URL",
        targetUrlHint: "https://example.com — only visitor-visible content is captured",
        request: "What do you want",
        requestHint: "e.g. Recreate this landing page as my product page in React",
        stack: "Stack (optional)",
        stackHint: "e.g. React + Vite / plain HTML + CSS",
        name: "Project name (optional)",
        mode: "Mode",
        modeClean: "Clean room",
        modeCleanHint: "Only screenshots, visible text and computed styles; never the source",
        modeDeep: "Deep",
        modeDeepHint: "Also saves the rendered HTML for understanding",
        overview: "Projects",
        noProjects: "No projects yet",
        noProjectsHint: "Paste a URL to study its layout, colours, fonts and breakpoints, then have the agent build your own version in app/.",
        stepStudy: "Study",
        stepBuild: "Build",
        stepCheck: "Check",
        stepReady: "Ready",
        stepPending: "Pending",
        stepRunning: "Running",
        stepDone: "Done",
        stepFailed: "Failed",
        study: "Study target",
        restudy: "Study again",
        check: "Check rebuild",
        checking: "Checking…",
        briefBtn: "Build brief",
        briefRefresh: "Refresh brief",
        openFolder: "Open folder",
        preview: "Preview build",
        brief: "Build brief",
        briefHint: "The hand-off to the builder: measured values, structure, breakpoints, originality rules and acceptance criteria.",
        briefEmpty: "No brief yet. Generate one after studying.",
        copy: "Copy",
        copied: "Copied",
        screenshots: "Original screenshots",
        screenshotsHint: "Three viewports; white areas are self-changing regions excluded from checks.",
        page: "Page",
        width: "Width",
        colors: "Colours",
        backgrounds: "Backgrounds",
        textColors: "Text",
        typography: "Fonts & sizes",
        spacing: "Spacing / radii",
        breakpoints: "Breakpoints",
        evidence: "Evidence",
        evidenceHint: "Every record carries confidence, coverage and limitations.",
        evidenceEmpty: "No evidence records yet.",
        confidence: "Confidence",
        limitations: "Limitations",
        coverage: "Coverage",
        checks: "Check rounds",
        checksHint: "Each round's score, per-viewport breakdown and fix list.",
        checksEmpty: "No checks yet. Write the rebuild into app/ and run a check.",
        round: "Round {n}",
        score: "Score",
        layout: "Layout",
        detail: "Detail",
        token: "Design language",
        diffImages: "Diff images",
        failedClaims: "Failed claims",
        unknowns: "Not compared",
        notes: "Differences",
        designDiffs: "Design differences",
        textDiffs: "Text differences",
        structureDiffs: "Structure differences",
        regions: "Top regions",
        capture: "Capture",
        createdAt: "Created",
        updatedAt: "Updated",
        pages: "Pages",
        duration: "Duration",
        limitationsBox: "Study limitations",
        jobRunning: "Job running",
        jobFailed: "Job failed",
        jobDone: "Done",
        cancelJob: "Cancel job",
        jobPhase: "Phase",
        statusDraft: "Draft",
        statusStudied: "Studied",
        statusChecked: "Checked",
        statusReady: "Ready",
        statusBuilding: "Building",
        emptyProjectsTitle: "Start with any website",
        emptyProjectsBody: "Study → Brief → Build → Check. The study records screenshots and measurements; the check returns a 0–100 likeness score and a fix list.",
        addFirst: "Study your first website",
        back: "Back to projects",
        noBrowser: "No Chrome or Edge found; study and check are unavailable. Install a browser or set browserPath and restart.",
        mode: "Mode",
        stackLabel: "Stack",
        pagesCount: "{n} pages",
        widthsLabel: "Viewports",
        appSize: "Build size",
        best: "Best",
        latest: "Latest",
        open: "Open",
        showMore: "Show more",
        showLess: "Show less",
        overviewTab: "Projects",
        evidenceTab: "Evidence",
        briefTab: "Brief",
        checksTab: "Checks",
        settingsHint: "Plugin data directory",
        browser: "Browser",
        diagnostics: "Diagnostics",
        unknownError: "Request failed",
        appMissing: "Nothing to serve in app/ yet (index.html, or dist/ / build/ / out/).",
        refreshDone: "Refreshed",
        chars: "chars",
        evidenceCount: "{n} records",
        readyHint: "A score of 90+ counts as ready; keep fixing the failed claims and diff regions.",
        scoreLabel: "Likeness",
        grade: "Grade",
        jobQueued: "Job started in the background",
        newProjectTitle: "Create a project",
        projectNamePlaceholder: "My rebuild",
        targetPlaceholder: "https://example.com",
        requestPlaceholder: "Recreate this page: keep the layout, palette and typography feel, write my own copy",
        stackPlaceholder: "React + Vite (leave empty to let the builder choose)",
        modeExplanation: "Clean room never reads the original's source. Deep mode only when you own or are authorised to inspect it.",
        deleteProject: "Delete project",
        openImage: "Open in new tab",
        noWidths: "No capture data",
        copyBrief: "Copy brief",
        regenerate: "Regenerate",
        done: "Done",
        running: "Running",
        failed: "Failed",
        cancelled: "Cancelled",
      },
    }

    function readLang() {
      try {
        const value = window.localStorage.getItem(LANG_KEY)
        if (value === "zh" || value === "en") return value
      } catch {}
      return "zh"
    }

    function writeLang(lang) {
      try {
        window.localStorage.setItem(LANG_KEY, lang)
      } catch {}
    }

    function lookup(dictionary, key) {
      return dictionary[key] !== undefined ? dictionary[key] : key
    }

    function makeT(lang) {
      const dictionary = DICTIONARIES[lang] || DICTIONARIES.zh
      return function t(key, vars) {
        let text = lookup(dictionary, key)
        if (vars && typeof text === "string") {
          for (const [name, value] of Object.entries(vars)) text = text.split("{" + name + "}").join(String(value))
        }
        return text
      }
    }

    /* ------------------------------------------------------------------ */
    /* API                                                                 */
    /* ------------------------------------------------------------------ */

    async function request(path, options) {
      const opts = options || {}
      const headers = Object.assign({}, opts.headers || {})
      headers[REQ_HEADER] = "1"
      if (opts.body !== undefined) headers["content-type"] = "application/json"
      let response
      try {
        response = await fetch(API_BASE + path, {
          method: opts.method || "GET",
          headers,
          body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
          cache: "no-store",
        })
      } catch (error) {
        throw new Error(String(error && error.message ? error.message : error))
      }
      let payload = null
      try {
        payload = await response.json()
      } catch {}
      if (!response.ok || (payload && payload.ok === false)) {
        const message = payload && payload.error ? payload.error : "HTTP " + response.status
        const error = new Error(message)
        error.code = payload && payload.code ? payload.code : "http_" + response.status
        error.repair = payload && payload.repair ? payload.repair : null
        throw error
      }
      return payload || {}
    }

    function apiGet(path) {
      return request(path, {})
    }

    function apiPost(path, body) {
      return request(path, { method: "POST", body: body === undefined ? {} : body })
    }

    function imageUrl(projectId, path) {
      // Panels talk to /file with project-root-relative paths. Older project
      // detail payloads shipped capture-relative names ("screenshot-1440.png",
      // "routes/<slug>/noise-1440.png"), which 404'd as broken images; keep
      // that shape readable by normalising it here as well.
      var resolved = String(path || "")
      if (/^(?:screenshot|noise)-\d+\.png$/.test(resolved) || /^routes\/[^/]+\/(?:screenshot|noise)-\d+\.png$/.test(resolved)) {
        resolved = "capture/" + resolved
      }
      return API_BASE + "/api/projects/" + encodeURIComponent(projectId) + "/file?path=" + encodeURIComponent(resolved)
    }

    function messageOf(error) {
      return error && error.message ? error.message : String(error)
    }

    /* ------------------------------------------------------------------ */
    /* Styles                                                              */
    /* ------------------------------------------------------------------ */

    const STYLES = `
      .dca-root {
        --dca-fg: var(--dsw-alias-label-primary, #1d2428);
        --dca-fg2: var(--dsw-alias-label-secondary, #4c5a5e);
        --dca-fg3: var(--dsw-alias-label-tertiary, #7a8a8e);
        --dca-border: var(--dsw-alias-border-l1, rgba(127, 127, 127, 0.2));
        --dca-border2: var(--dsw-alias-border-l3, rgba(127, 127, 127, 0.38));
        --dca-bg1: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.62));
        --dca-bg2: var(--dsw-alias-bg-layer-2, rgba(127, 127, 127, 0.07));
        --dca-base: var(--dsw-alias-bg-base, #ffffff);
        --dca-ok: var(--dsw-alias-state-success, #18794e);
        --dca-warn: var(--dsw-alias-state-warning, #9a6700);
        --dca-err: var(--dsw-alias-state-error, #b3261e);
        --dca-accent: ${ACCENT};
        --dca-accent-soft: color-mix(in srgb, var(--dca-accent) 12%, transparent);
        --dca-gold: ${GOLD};
        --dca-mono: var(--dsw-alias-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
        height: 100%;
        min-height: 0;
        color: var(--dca-fg);
        font-size: 13px;
        line-height: 1.5;
        display: flex;
        flex-direction: column;
        background: var(--dca-base);
      }
      body[data-ds-dark-theme] .dca-root { --dca-accent: ${ACCENT_DARK}; }
      .dca-root * { box-sizing: border-box; }
      .dca-root button, .dca-root input, .dca-root textarea, .dca-root select { font: inherit; color: inherit; }
      .dca-root ::selection { background: color-mix(in srgb, var(--dca-accent) 26%, transparent); }
      .dca-shell { display: flex; flex-direction: column; height: 100%; min-height: 0; }
      .dca-topbar {
        display: flex; align-items: center; gap: 12px;
        padding: 14px 22px; border-bottom: 0.5px solid var(--dca-border);
        background: color-mix(in srgb, var(--dca-bg1) 70%, transparent);
        flex: none;
      }
      .dca-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .dca-brand-mark {
        width: 30px; height: 30px; border-radius: 9px; flex: none;
        background: linear-gradient(135deg, #0f3b46, #08222a);
        display: grid; place-items: center; color: #ffd479;
        box-shadow: 0 1px 0 rgba(255,255,255,.14) inset;
      }
      .dca-brand-title { font-size: 15px; font-weight: 650; letter-spacing: .2px; }
      .dca-brand-sub { font-size: 11px; color: var(--dca-fg3); margin-top: 1px; }
      .dca-topbar-spacer { flex: 1; }
      .dca-topbar-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
      .dca-main { flex: 1; min-height: 0; overflow: auto; }
      .dca-content { max-width: 1180px; margin: 0 auto; padding: 22px 24px 60px; }
      .dca-h1 { font-size: 21px; font-weight: 680; letter-spacing: -.2px; margin: 0; }
      .dca-h2 { font-size: 14px; font-weight: 650; margin: 0; display: flex; align-items: center; gap: 8px; }
      .dca-sub { color: var(--dca-fg3); font-size: 12px; margin: 4px 0 0; }
      .dca-card {
        border: 0.5px solid var(--dca-border); border-radius: 13px;
        background: color-mix(in srgb, var(--dca-bg1) 85%, var(--dca-base));
        padding: 16px 18px; min-width: 0;
      }
      .dca-card + .dca-card { margin-top: 14px; }
      .dca-card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
      .dca-card-head .dca-h2 { flex: 1; min-width: 0; }
      .dca-muted { color: var(--dca-fg3); }
      .dca-dim { color: var(--dca-fg2); }
      .dca-mono { font-family: var(--dca-mono); font-size: 11.5px; }
      .dca-break { overflow-wrap: anywhere; }
      .dca-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .dca-grid-2 { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 16px; align-items: start; }
      .dca-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      .dca-hr { border: 0; border-top: 0.5px solid var(--dca-border); margin: 14px 0; }

      .dca-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        border: 0.5px solid var(--dca-border2); background: transparent; color: var(--dca-fg);
        border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 550;
        cursor: pointer; white-space: nowrap; transition: background .12s ease, border-color .12s ease;
      }
      .dca-btn:hover { background: var(--dca-bg2); }
      .dca-btn:focus-visible { outline: 2px solid var(--dca-accent); outline-offset: 1px; }
      .dca-btn:disabled { opacity: .5; cursor: not-allowed; }
      .dca-btn-primary { background: var(--dca-accent); border-color: transparent; color: #fff; font-weight: 620; }
      body[data-ds-dark-theme] .dca-btn-primary { color: #08222a; }
      .dca-btn-primary:hover { background: var(--dca-accent); filter: brightness(1.07); }
      .dca-btn-ghost { border-color: transparent; color: var(--dca-fg2); }
      .dca-btn-danger { color: var(--dca-err); border-color: color-mix(in srgb, var(--dca-err) 34%, transparent); }
      .dca-btn-danger:hover { background: color-mix(in srgb, var(--dca-err) 9%, transparent); }
      .dca-btn-sm { padding: 4px 9px; font-size: 11.5px; border-radius: 7px; }
      .dca-icon-btn { padding: 5px; width: 28px; height: 28px; }

      .dca-chip {
        display: inline-flex; align-items: center; gap: 5px;
        border: 0.5px solid var(--dca-border2); border-radius: 999px;
        padding: 2px 9px; font-size: 10.5px; color: var(--dca-fg2); white-space: nowrap;
      }
      .dca-chip-ok { color: var(--dca-ok); border-color: color-mix(in srgb, var(--dca-ok) 34%, transparent); background: color-mix(in srgb, var(--dca-ok) 9%, transparent); }
      .dca-chip-warn { color: var(--dca-warn); border-color: color-mix(in srgb, var(--dca-warn) 36%, transparent); background: color-mix(in srgb, var(--dca-warn) 9%, transparent); }
      .dca-chip-err { color: var(--dca-err); border-color: color-mix(in srgb, var(--dca-err) 36%, transparent); background: color-mix(in srgb, var(--dca-err) 8%, transparent); }
      .dca-chip-accent { color: var(--dca-accent); border-color: color-mix(in srgb, var(--dca-accent) 38%, transparent); background: var(--dca-accent-soft); }
      .dca-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: none; }

      .dca-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
      .dca-label { font-size: 11.5px; font-weight: 600; color: var(--dca-fg2); }
      .dca-hint { font-size: 10.5px; color: var(--dca-fg3); }
      .dca-input, .dca-textarea, .dca-select {
        width: 100%; border: 0.5px solid var(--dca-border2); border-radius: 8px;
        background: var(--dca-bg2); padding: 7px 10px; font-size: 12.5px; outline: none;
      }
      .dca-input:focus, .dca-textarea:focus, .dca-select:focus { border-color: var(--dca-accent); box-shadow: 0 0 0 2px var(--dca-accent-soft); }
      .dca-textarea { resize: vertical; min-height: 62px; line-height: 1.55; }
      .dca-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .dca-form-grid .dca-span-2 { grid-column: 1 / -1; }

      .dca-steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 14px 0 4px; }
      .dca-step { position: relative; border: 0.5px solid var(--dca-border); border-radius: 10px; padding: 9px 11px; background: var(--dca-bg2); min-width: 0; }
      .dca-step-label { font-size: 11.5px; font-weight: 620; display: flex; align-items: center; gap: 6px; }
      .dca-step-index { width: 16px; height: 16px; border-radius: 50%; display: grid; place-items: center; font-size: 9.5px; border: 1px solid var(--dca-border2); color: var(--dca-fg3); flex: none; }
      .dca-step[data-state="done"] { border-color: color-mix(in srgb, var(--dca-ok) 40%, transparent); }
      .dca-step[data-state="done"] .dca-step-index { background: var(--dca-ok); color: #fff; border-color: transparent; }
      .dca-step[data-state="running"] { border-color: color-mix(in srgb, var(--dca-accent) 50%, transparent); background: var(--dca-accent-soft); }
      .dca-step[data-state="running"] .dca-step-index { border-color: var(--dca-accent); color: var(--dca-accent); }
      .dca-step[data-state="failed"] { border-color: color-mix(in srgb, var(--dca-err) 45%, transparent); }
      .dca-step[data-state="failed"] .dca-step-index { background: var(--dca-err); border-color: transparent; color: #fff; }
      .dca-step-detail { font-size: 10px; color: var(--dca-fg3); margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      .dca-progress { margin: 12px 0 0; border: 0.5px solid var(--dca-border); border-radius: 10px; padding: 10px 12px; background: var(--dca-bg2); }
      .dca-progress-head { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--dca-fg2); }
      .dca-progress-track { height: 5px; border-radius: 999px; background: var(--dca-border); margin-top: 8px; overflow: hidden; }
      .dca-progress-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--dca-accent), var(--dca-gold)); transition: width .35s ease; }
      .dca-progress-note { font-size: 10.5px; color: var(--dca-fg3); margin-top: 6px; overflow-wrap: anywhere; }

      .dca-project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 12px; margin-top: 14px; }
      .dca-project {
        text-align: left; border: 0.5px solid var(--dca-border); border-radius: 12px;
        background: color-mix(in srgb, var(--dca-bg1) 88%, var(--dca-base));
        padding: 14px; cursor: pointer; display: flex; flex-direction: column; gap: 9px;
        transition: border-color .15s ease, transform .15s ease, background .15s ease;
      }
      .dca-project:hover { border-color: color-mix(in srgb, var(--dca-accent) 42%, transparent); background: var(--dca-bg2); }
      .dca-project:focus-visible { outline: 2px solid var(--dca-accent); outline-offset: 1px; }
      .dca-project-top { display: flex; align-items: flex-start; gap: 10px; }
      .dca-project-name { font-size: 13.5px; font-weight: 640; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dca-project-url { font-size: 10.5px; color: var(--dca-fg3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }
      .dca-project-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 10.5px; color: var(--dca-fg3); }
      .dca-score-badge {
        flex: none; width: 44px; height: 44px; border-radius: 50%;
        display: grid; place-items: center; font-size: 13px; font-weight: 700;
        border: 2px solid var(--dca-border); color: var(--dca-fg2);
      }
      .dca-score-badge[data-grade="S"], .dca-score-badge[data-grade="A"] { border-color: color-mix(in srgb, var(--dca-ok) 55%, transparent); color: var(--dca-ok); }
      .dca-score-badge[data-grade="B"] { border-color: color-mix(in srgb, var(--dca-gold) 60%, transparent); color: var(--dca-gold); }
      .dca-score-badge[data-grade="C"], .dca-score-badge[data-grade="D"], .dca-score-badge[data-grade="E"] { border-color: color-mix(in srgb, var(--dca-err) 45%, transparent); color: var(--dca-err); }

      .dca-empty { border: 1px dashed var(--dca-border2); border-radius: 14px; padding: 34px 24px; text-align: center; margin-top: 16px; }
      .dca-empty-title { font-size: 15px; font-weight: 650; margin: 0 0 6px; }
      .dca-empty-body { font-size: 12px; color: var(--dca-fg3); max-width: 520px; margin: 0 auto; line-height: 1.65; }
      .dca-flow { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 14px; color: var(--dca-fg3); font-size: 11px; flex-wrap: wrap; }

      .dca-hero { display: flex; align-items: flex-end; gap: 18px; flex-wrap: wrap; margin-bottom: 16px; }
      .dca-hero-text { flex: 1; min-width: 240px; }
      .dca-kicker { font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--dca-gold); font-weight: 650; }

      .dca-shots { border: 0.5px solid var(--dca-border); border-radius: 11px; overflow: hidden; background: var(--dca-bg2); }
      .dca-shot-tabs { display: flex; gap: 4px; padding: 8px; border-bottom: 0.5px solid var(--dca-border); flex-wrap: wrap; align-items: center; }
      .dca-tab {
        border: 0.5px solid transparent; background: transparent; border-radius: 6px;
        padding: 3px 9px; font-size: 11px; color: var(--dca-fg3); cursor: pointer;
      }
      .dca-tab[aria-selected="true"] { background: var(--dca-accent-soft); color: var(--dca-accent); font-weight: 650; border-color: color-mix(in srgb, var(--dca-accent) 30%, transparent); }
      .dca-shot-body { padding: 10px; }
      .dca-shot-body img { width: 100%; height: auto; display: block; border-radius: 6px; border: 0.5px solid var(--dca-border); background: #fff; }
      .dca-shot-caption { display: flex; justify-content: space-between; gap: 8px; font-size: 10.5px; color: var(--dca-fg3); margin-top: 8px; flex-wrap: wrap; }

      .dca-swatches { display: flex; flex-wrap: wrap; gap: 7px; }
      .dca-swatch { display: inline-flex; align-items: center; gap: 6px; border: 0.5px solid var(--dca-border); border-radius: 7px; padding: 3px 7px 3px 4px; font-size: 10.5px; color: var(--dca-fg2); }
      .dca-swatch i { width: 15px; height: 15px; border-radius: 4px; border: 0.5px solid rgba(0,0,0,.16); display: inline-block; }
      .dca-kv { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 4px 10px; margin: 0; font-size: 11.5px; }
      .dca-kv dt { color: var(--dca-fg3); }
      .dca-kv dd { margin: 0; color: var(--dca-fg2); overflow-wrap: anywhere; }
      .dca-token-list { display: flex; flex-wrap: wrap; gap: 5px; }
      .dca-token { font-family: var(--dca-mono); font-size: 10.5px; background: var(--dca-bg2); border: 0.5px solid var(--dca-border); border-radius: 5px; padding: 1px 6px; color: var(--dca-fg2); }
      .dca-token b { font-family: inherit; font-weight: 600; color: var(--dca-fg); }

      .dca-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
      .dca-table th { text-align: left; font-weight: 600; color: var(--dca-fg3); font-size: 10.5px; padding: 6px 8px; border-bottom: 0.5px solid var(--dca-border); white-space: nowrap; }
      .dca-table td { padding: 6px 8px; border-bottom: 0.5px solid var(--dca-border); vertical-align: top; }
      .dca-table tr:last-child td { border-bottom: 0; }
      .dca-bar { height: 5px; border-radius: 999px; background: var(--dca-border); overflow: hidden; min-width: 46px; }
      .dca-bar-fill { height: 100%; border-radius: 999px; background: var(--dca-accent); }
      .dca-bar-fill[data-tone="warn"] { background: var(--dca-gold); }
      .dca-bar-fill[data-tone="err"] { background: var(--dca-err); }
      .dca-bar-fill[data-tone="ok"] { background: var(--dca-ok); }

      .dca-list { display: flex; flex-direction: column; }
      .dca-list-row { border-bottom: 0.5px solid var(--dca-border); padding: 8px 2px; }
      .dca-list-row:last-child { border-bottom: 0; }
      .dca-list-title { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 580; cursor: pointer; }
      .dca-list-title .dca-grow { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dca-list-body { margin: 6px 0 2px 0; font-size: 11.5px; color: var(--dca-fg2); line-height: 1.6; }
      .dca-list-body p { margin: 0 0 5px; }
      .dca-bullets { margin: 0; padding-left: 16px; }
      .dca-bullets li { margin: 1px 0; }
      .dca-caret { transition: transform .15s ease; color: var(--dca-fg3); display: inline-flex; }
      .dca-caret[data-open="true"] { transform: rotate(90deg); }

      .dca-brief {
        border: 0.5px solid var(--dca-border); border-radius: 10px; background: var(--dca-bg2);
        max-height: 340px; overflow: auto; margin: 0; padding: 12px 14px;
        font-family: var(--dca-mono); font-size: 11px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere;
      }
      .dca-brief-full { max-height: none; }

      .dca-check { border: 0.5px solid var(--dca-border); border-radius: 11px; background: var(--dca-bg2); padding: 12px 14px; }
      .dca-check + .dca-check { margin-top: 10px; }
      .dca-check-head { display: flex; align-items: center; gap: 10px; cursor: pointer; }
      .dca-check-score { font-size: 20px; font-weight: 720; letter-spacing: -.5px; }
      .dca-check-score[data-tone="ok"] { color: var(--dca-ok); }
      .dca-check-score[data-tone="warn"] { color: var(--dca-gold); }
      .dca-check-score[data-tone="err"] { color: var(--dca-err); }
      .dca-check-body { margin-top: 12px; display: flex; flex-direction: column; gap: 10px; }
      .dca-diff-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
      .dca-diff { border: 0.5px solid var(--dca-border); border-radius: 8px; overflow: hidden; background: #111; }
      .dca-diff img { width: 100%; display: block; }
      .dca-diff span { display: block; padding: 4px 7px; font-size: 10px; color: var(--dca-fg3); background: var(--dca-bg2); }
      .dca-region { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--dca-fg2); padding: 3px 0; }
      .dca-region-bar { flex: 1; max-width: 220px; }
      .dca-notice { border-radius: 9px; padding: 8px 12px; font-size: 11.5px; margin-bottom: 12px; border: 0.5px solid; }
      .dca-notice-err { color: var(--dca-err); border-color: color-mix(in srgb, var(--dca-err) 34%, transparent); background: color-mix(in srgb, var(--dca-err) 8%, transparent); }
      .dca-notice-ok { color: var(--dca-ok); border-color: color-mix(in srgb, var(--dca-ok) 30%, transparent); background: color-mix(in srgb, var(--dca-ok) 8%, transparent); }
      .dca-notice-warn { color: var(--dca-warn); border-color: color-mix(in srgb, var(--dca-warn) 34%, transparent); background: color-mix(in srgb, var(--dca-warn) 8%, transparent); }
      .dca-spinner { width: 13px; height: 13px; border: 2px solid var(--dca-border); border-top-color: var(--dca-accent); border-radius: 50%; animation: dca-spin .7s linear infinite; flex: none; }
      .dca-loading { display: flex; align-items: center; gap: 8px; color: var(--dca-fg3); font-size: 12px; padding: 18px 4px; }
      .dca-footer-note { margin-top: 22px; text-align: center; font-size: 10.5px; color: var(--dca-fg3); }
      .dca-link { color: var(--dca-accent); text-decoration: none; border-bottom: 0.5px solid color-mix(in srgb, var(--dca-accent) 40%, transparent); }
      .dca-link:hover { border-bottom-color: var(--dca-accent); }
      .dca-summary-score { display: flex; align-items: baseline; gap: 6px; }
      .dca-summary-score b { font-size: 26px; letter-spacing: -1px; }
      .dca-tabs { display: flex; gap: 4px; border-bottom: 0.5px solid var(--dca-border); margin-bottom: 14px; flex-wrap: wrap; }
      .dca-tabbtn { border: 0; background: transparent; border-bottom: 2px solid transparent; padding: 7px 11px; font-size: 12px; color: var(--dca-fg3); cursor: pointer; margin-bottom: -0.5px; }
      .dca-tabbtn[aria-selected="true"] { color: var(--dca-accent); border-bottom-color: var(--dca-accent); font-weight: 620; }
      .dca-tabbtn:focus-visible { outline: 2px solid var(--dca-accent); outline-offset: -2px; }
      .dca-pre { font-family: var(--dca-mono); font-size: 11px; white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; color: var(--dca-fg2); }

      @media (max-width: 900px) {
        .dca-grid-2 { grid-template-columns: minmax(0, 1fr); }
        .dca-steps { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .dca-content { padding: 18px 16px 50px; }
      }
      @media (max-width: 620px) {
        .dca-topbar { padding: 12px 14px; }
        .dca-brand-sub { display: none; }
        .dca-form-grid { grid-template-columns: minmax(0, 1fr); }
        .dca-steps { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .dca-grid-3 { grid-template-columns: minmax(0, 1fr); }
        .dca-kv { grid-template-columns: 76px minmax(0, 1fr); }
        .dca-project-grid { grid-template-columns: minmax(0, 1fr); }
      }
      @media (prefers-reduced-motion: reduce) {
        .dca-root *, .dca-root *::before, .dca-root *::after { animation-duration: 0s !important; transition-duration: 0s !important; }
      }
    `

    /* ------------------------------------------------------------------ */
    /* Small primitives                                                    */
    /* ------------------------------------------------------------------ */

    function Icon(props) {
      const name = props && props.name ? props.name : "scan"
      const size = props && props.size ? props.size : 15
      const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }
      if (name === "back") return h("svg", common, h("path", { d: "M15 5l-7 7 7 7" }))
      if (name === "refresh") return h("svg", common, h("path", { d: "M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" }))
      if (name === "play") return h("svg", common, h("path", { d: "M8 5l11 7-11 7V5z" }))
      if (name === "folder") return h("svg", common, h("path", { d: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" }))
      if (name === "doc") return h("svg", common, h("path", { d: "M7 3h7l4 4v14H7V3zM14 3v4h4M9 12h6M9 16h6" }))
      if (name === "check") return h("svg", common, h("path", { d: "M20 6L9 17l-5-5" }))
      if (name === "trash") return h("svg", common, h("path", { d: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" }))
      if (name === "external") return h("svg", common, h("path", { d: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" }))
      if (name === "copy") return h("svg", common, h("path", { d: "M9 9h11v11H9V9zM5 15V4h11" }))
      if (name === "chevron") return h("svg", common, h("path", { d: "M9 6l6 6-6 6" }))
      if (name === "spark") return h("svg", common, h("path", { d: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" }))
      if (name === "stop") return h("svg", common, h("rect", { x: 6, y: 6, width: 12, height: 12, rx: 2 }))
      return h(
        "svg",
        common,
        h("path", { d: "M12 3v18M5.5 7.5l13 9M18.5 7.5l-13 9" }),
      )
    }

    function Btn(props) {
      const p = props || {}
      const cls = "dca-btn" + (p.variant === "primary" ? " dca-btn-primary" : p.variant === "danger" ? " dca-btn-danger" : p.variant === "ghost" ? " dca-btn-ghost" : "") + (p.size === "sm" ? " dca-btn-sm" : "") + (p.iconOnly ? " dca-icon-btn" : "")
      return h(
        "button",
        { type: "button", className: cls, onClick: p.onClick, disabled: p.disabled, title: p.title, "aria-label": p.title || p.label || undefined },
        p.glyph ? h(Icon, { name: p.glyph, size: p.size === "sm" ? 12 : 14 }) : null,
        p.iconOnly ? null : h("span", null, p.label),
      )
    }

    function Chip(props) {
      const p = props || {}
      return h("span", { className: "dca-chip" + (p.tone ? " dca-chip-" + p.tone : "") }, p.dot ? h("span", { className: "dca-dot" }) : null, p.label)
    }

    function Bar(props) {
      const p = props || {}
      const value = Math.max(0, Math.min(100, Number(p.value) || 0))
      const tone = value >= 90 ? "ok" : value >= 70 ? "" : value >= 50 ? "warn" : "err"
      return h("div", { className: "dca-bar", title: p.title || value + "%" }, h("div", { className: "dca-bar-fill", "data-tone": p.tone || tone, style: { width: value + "%" } }))
    }

    function ScoreBadge(props) {
      const p = props || {}
      const score = p.score === null || p.score === undefined ? null : Math.round(Number(p.score) * 10) / 10
      const grade = p.grade || (score === null ? "" : score >= 97 ? "S" : score >= 90 ? "A" : score >= 80 ? "B" : score >= 65 ? "C" : score >= 45 ? "D" : "E")
      return h("div", { className: "dca-score-badge", "data-grade": grade, title: p.title || (score === null ? "" : "score " + score) }, score === null ? "–" : score)
    }

    function Spinner() {
      return h("span", { className: "dca-spinner" })
    }

    function Loading(props) {
      return h("div", { className: "dca-loading" }, h(Spinner), h("span", null, props && props.label ? props.label : "…"))
    }

    function Notice(props) {
      const p = props || {}
      return h("div", { className: "dca-notice dca-notice-" + (p.tone || "warn") }, p.children)
    }

    function Collapsible(props) {
      const p = props || {}
      const [open, setOpen] = useState(p.initialOpen === true)
      return h(
        "div",
        { className: "dca-list-row" },
        h(
          "div",
          { className: "dca-list-title", role: "button", tabIndex: 0, "aria-expanded": open, onClick: () => setOpen((value) => !value), onKeyDown: (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpen((value) => !value) } } },
          h("span", { className: "dca-caret", "data-open": open ? "true" : "false" }, h(Icon, { name: "chevron", size: 12 })),
          h("span", { className: "dca-grow" }, p.title),
          p.right || null,
        ),
        open ? h("div", { className: "dca-list-body" }, p.children) : null,
      )
    }

    function fmtTime(iso) {
      if (!iso) return ""
      try {
        const date = new Date(iso)
        if (Number.isNaN(date.getTime())) return String(iso)
        const now = Date.now()
        const diff = now - date.getTime()
        if (diff >= 0 && diff < 60 * 60 * 1000) return Math.max(1, Math.round(diff / 60000)) + " 分钟前"
        if (diff >= 0 && diff < 24 * 60 * 60 * 1000) return Math.round(diff / 3600000) + " 小时前"
        const pad = (n) => String(n).padStart(2, "0")
        return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes())
      } catch {
        return String(iso)
      }
    }

    function fmtDuration(ms) {
      const n = Number(ms) || 0
      if (n < 1000) return n + " ms"
      if (n < 60000) return (n / 1000).toFixed(1) + " s"
      return Math.floor(n / 60000) + " 分 " + Math.round((n % 60000) / 1000) + " 秒"
    }

    function fmtBytes(bytes) {
      const n = Number(bytes)
      if (!Number.isFinite(n) || n <= 0) return "–"
      if (n < 1024) return Math.round(n) + " B"
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB"
      return (n / (1024 * 1024)).toFixed(1) + " MB"
    }

    function statusMeta(status, t) {
      if (status === "ready") return { label: t("statusReady"), tone: "ok" }
      if (status === "checked") return { label: t("statusChecked"), tone: "accent" }
      if (status === "studied") return { label: t("statusStudied"), tone: "accent" }
      if (status === "building") return { label: t("statusBuilding"), tone: "warn" }
      return { label: t("statusDraft"), tone: "" }
    }

    function stepState(steps, key) {
      const step = steps && steps[key] ? steps[key] : null
      if (!step) return "pending"
      if (step.state === "running") return "running"
      if (step.state === "failed") return "failed"
      if (step.state === "done") return "done"
      return "pending"
    }

    /* ------------------------------------------------------------------ */
    /* Overview: new project + project cards                               */
    /* ------------------------------------------------------------------ */

    function NewProjectForm(props) {
      const p = props || {}
      const t = p.t
      const [fields, setFields] = useState({ url: "", request: "", stack: "", name: "", mode: "clean" })
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState("")
      const set = (key) => (event) => setFields((current) => Object.assign({}, current, { [key]: event.target.value }))
      const submit = async (event) => {
        if (event && event.preventDefault) event.preventDefault()
        const url = String(fields.url || "").trim()
        if (!url) {
          setError(t("targetUrlHint"))
          return
        }
        setBusy(true)
        setError("")
        try {
          const created = await apiPost("/api/projects", {
            url,
            request: fields.request,
            stack: fields.stack,
            name: fields.name,
            mode: fields.mode,
          })
          const projectId = created.project && created.project.id
          if (!projectId) throw new Error("no project id returned")
          await apiPost("/api/projects/" + encodeURIComponent(projectId) + "/study", {})
          if (p.onCreated) p.onCreated(projectId)
        } catch (e) {
          setError(messageOf(e))
        } finally {
          setBusy(false)
        }
      }
      const disabled = busy || !String(fields.url || "").trim()
      return h(
        "form",
        { className: "dca-card", onSubmit: submit, "aria-label": t("newProjectTitle") },
        h("div", { className: "dca-card-head" }, h("h2", { className: "dca-h2" }, h(Icon, { name: "spark" }), t("newProjectTitle")), h("span", { className: "dca-sub" }, t("modeExplanation"))),
        error ? h(Notice, { tone: "err" }, error) : null,
        h(
          "div",
          { className: "dca-form-grid" },
          h(
            "div",
            { className: "dca-field dca-span-2" },
            h("label", { className: "dca-label", htmlFor: "dca-url" }, t("targetUrl")),
            h("input", { id: "dca-url", className: "dca-input", type: "url", placeholder: t("targetPlaceholder"), value: fields.url, onChange: set("url"), disabled: busy, autoComplete: "off", spellCheck: false }),
            h("span", { className: "dca-hint" }, t("targetUrlHint")),
          ),
          h(
            "div",
            { className: "dca-field dca-span-2" },
            h("label", { className: "dca-label", htmlFor: "dca-request" }, t("request")),
            h("textarea", { id: "dca-request", className: "dca-textarea", placeholder: t("requestPlaceholder"), value: fields.request, onChange: set("request"), disabled: busy }),
            h("span", { className: "dca-hint" }, t("requestHint")),
          ),
          h(
            "div",
            { className: "dca-field" },
            h("label", { className: "dca-label", htmlFor: "dca-stack" }, t("stack")),
            h("input", { id: "dca-stack", className: "dca-input", placeholder: t("stackPlaceholder"), value: fields.stack, onChange: set("stack"), disabled: busy }),
          ),
          h(
            "div",
            { className: "dca-field" },
            h("label", { className: "dca-label", htmlFor: "dca-name" }, t("name")),
            h("input", { id: "dca-name", className: "dca-input", placeholder: t("projectNamePlaceholder"), value: fields.name, onChange: set("name"), disabled: busy }),
          ),
          h(
            "div",
            { className: "dca-field" },
            h("label", { className: "dca-label", htmlFor: "dca-mode" }, t("mode")),
            h(
              "select",
              { id: "dca-mode", className: "dca-select", value: fields.mode, onChange: set("mode"), disabled: busy },
              h("option", { value: "clean" }, t("modeClean") + " — " + t("modeCleanHint")),
              h("option", { value: "deep" }, t("modeDeep") + " — " + t("modeDeepHint")),
            ),
          ),
          h(
            "div",
            { className: "dca-field", style: { justifyContent: "flex-end" } },
            h("label", { className: "dca-label", style: { visibility: "hidden" } }, "·"),
            h(
              "button",
              { type: "submit", className: "dca-btn dca-btn-primary", disabled },
              busy ? h(Spinner) : h(Icon, { name: "play", size: 13 }),
              h("span", null, busy ? t("creating") : t("create")),
            ),
          ),
        ),
      )
    }

    function ProjectCard(props) {
      const p = props || {}
      const t = p.t
      const project = p.project
      const meta = statusMeta(project.status, t)
      const score = project.lastScore !== null && project.lastScore !== undefined ? project.lastScore : project.bestScore
      return h(
        "button",
        { type: "button", className: "dca-project", onClick: () => p.onOpen && p.onOpen(project.id) },
        h(
          "div",
          { className: "dca-project-top" },
          h(
            "div",
            { style: { flex: 1, minWidth: 0 } },
            h("div", { className: "dca-project-name" }, project.name || project.url),
            h("div", { className: "dca-project-url dca-mono" }, project.url),
          ),
          h(ScoreBadge, { score, grade: null, title: t("scoreLabel") }),
        ),
        h(
          "div",
          { className: "dca-project-meta" },
          h(Chip, { label: meta.label, tone: meta.tone, dot: true }),
          h(Chip, { label: project.mode === "deep" ? t("modeDeep") : t("modeClean") }),
          project.pageCount ? h(Chip, { label: t("pagesCount", { n: project.pageCount }) }) : null,
          project.widths && project.widths.length ? h(Chip, { label: project.widths.join("/") + "px" }) : null,
        ),
        h(
          "div",
          { className: "dca-project-meta" },
          h("span", null, t("updatedAt") + " " + fmtTime(project.updatedAt)),
          project.checks ? h("span", null, "· " + project.checks + " 轮") : null,
          project.durationMs ? h("span", null, "· " + fmtDuration(project.durationMs)) : null,
        ),
      )
    }

    function OverviewPage(props) {
      const p = props || {}
      const t = p.t
      const data = p.data
      const projects = data && Array.isArray(data.projects) ? data.projects : []
      const browser = data && data.browser ? data.browser : null
      const supported = browser && browser.available
      return h(
        "div",
        null,
        h(
          "div",
          { className: "dca-hero" },
          h(
            "div",
            { className: "dca-hero-text" },
            h("div", { className: "dca-kicker" }, t("tagline")),
            h("h1", { className: "dca-h1", style: { marginTop: 4 } }, t("appSubtitle")),
            h("p", { className: "dca-sub" }, t("emptyProjectsBody")),
          ),
        ),
        !supported
          ? h(Notice, { tone: "err" }, t("noBrowser") + (browser && browser.path ? " (" + browser.path + ")" : ""))
          : null,
        h(NewProjectForm, { t, onCreated: p.onCreated }),
        h(
          "div",
          { className: "dca-card-head", style: { marginTop: 22 } },
          h("h2", { className: "dca-h2" }, t("overview"), h("span", { className: "dca-chip" }, projects.length)),
          h("span", { style: { flex: 1 } }),
          h(Btn, { size: "sm", variant: "ghost", glyph: "refresh", label: t("refresh"), onClick: p.onRefresh }),
        ),
        projects.length === 0
          ? h(
              "div",
              { className: "dca-empty" },
              h("p", { className: "dca-empty-title" }, t("emptyProjectsTitle")),
              h("p", { className: "dca-empty-body" }, t("noProjectsHint")),
              h(
                "div",
                { className: "dca-flow" },
                h("span", null, "① " + t("study")),
                h(Icon, { name: "chevron", size: 11 }),
                h("span", null, "② " + t("brief")),
                h(Icon, { name: "chevron", size: 11 }),
                h("span", null, "③ " + t("stepBuild")),
                h(Icon, { name: "chevron", size: 11 }),
                h("span", null, "④ " + t("check")),
              ),
            )
          : h(
              "div",
              { className: "dca-project-grid" },
              projects.map((project) => h(ProjectCard, { key: project.id, project, t, onOpen: p.onOpenProject })),
            ),
        data && data.dataDir
          ? h(
              "div",
              { className: "dca-footer-note" },
              t("settingsHint") + "：" + data.dataDir + " · v" + VERSION,
            )
          : null,
      )
    }

    /* ------------------------------------------------------------------ */
    /* Project detail                                                      */
    /* ------------------------------------------------------------------ */

    function StepsRail(props) {
      const t = props.t
      const steps = props.steps || {}
      const items = [
        { key: "study", label: t("stepStudy"), detail: steps.study && steps.study.durationMs ? fmtDuration(steps.study.durationMs) : "" },
        { key: "build", label: t("stepBuild"), detail: "" },
        { key: "check", label: t("stepCheck"), detail: steps.check && steps.check.score !== null && steps.check.score !== undefined ? t("score") + " " + steps.check.score : "" },
        { key: "ready", label: t("stepReady"), detail: "" },
      ]
      const stateLabel = { pending: t("stepPending"), running: t("stepRunning"), done: t("stepDone"), failed: t("stepFailed") }
      return h(
        "div",
        { className: "dca-steps" },
        items.map((item, index) => {
          const state = stepState(steps, item.key)
          return h(
            "div",
            { key: item.key, className: "dca-step", "data-state": state },
            h("div", { className: "dca-step-label" }, h("span", { className: "dca-step-index" }, state === "done" ? "✓" : index + 1), h("span", null, item.label)),
            h("div", { className: "dca-step-detail" }, state === "running" ? t("stepRunning") : state === "failed" ? t("stepFailed") : item.detail || stateLabel[state]),
          )
        }),
      )
    }

    function JobBar(props) {
      const t = props.t
      const job = props.job
      if (!job) return null
      if (job.status === "running") {
        return h(
          "div",
          { className: "dca-progress", role: "status" },
          h("div", { className: "dca-progress-head" }, h(Spinner), h("span", { style: { flex: 1 } }, t("jobRunning") + " · " + job.label), h("span", { className: "dca-mono" }, Math.round(job.progress.pct) + "%")),
          h("div", { className: "dca-progress-track" }, h("div", { className: "dca-progress-fill", style: { width: Math.max(2, job.progress.pct) + "%" } })),
          h("div", { className: "dca-progress-note" }, (job.progress.phase || "") + (job.progress.message ? " · " + job.progress.message : "")),
        )
      }
      if (job.status === "failed") {
        return h(Notice, { tone: "err" }, t("jobFailed") + "：" + (job.error || "unknown error"))
      }
      return null
    }

    function ScreenshotGallery(props) {
      const t = props.t
      const projectId = props.projectId
      const pages = props.pages || []
      const widths = props.widths || []
      const [pageIndex, setPageIndex] = useState(0)
      const [width, setWidth] = useState(widths[0] || 1440)
      const page = pages[Math.max(0, Math.min(pages.length - 1, pageIndex))] || null
      const shot = page && Array.isArray(page.screenshots) ? page.screenshots.find((row) => row.width === width) || page.screenshots[0] : null
      if (!page || !shot) return h(Notice, { tone: "warn" }, t("noWidths"))
      const widthData = Array.isArray(page.widthData) ? page.widthData.find((row) => row.width === width) : null
      return h(
        "div",
        { className: "dca-shots" },
        h(
          "div",
          { className: "dca-shot-tabs" },
          pages.length > 1
            ? h(
                "select",
                { className: "dca-select", style: { width: "auto", padding: "3px 8px", fontSize: 11 }, value: pageIndex, onChange: (event) => setPageIndex(Number(event.target.value)), "aria-label": t("page") },
                pages.map((row, index) => h("option", { key: row.path || index, value: index }, (row.path || "/") + (row.title ? " · " + row.title : ""))),
              )
            : h("span", { className: "dca-mono", style: { marginRight: 6 } }, page.path || "/"),
          h("span", { style: { flex: 1 } }),
          widths.map((w) =>
            h("button", { key: w, type: "button", className: "dca-tab", "aria-selected": w === width ? "true" : "false", onClick: () => setWidth(w) }, w + "px"),
          ),
        ),
        h(
          "div",
          { className: "dca-shot-body" },
          h("img", { src: imageUrl(projectId, shot.path), alt: (page.title || page.path || "/") + " @" + width + "px", loading: "lazy" }),
          h(
            "div",
            { className: "dca-shot-caption" },
            h("span", null, widthData ? widthData.pageW + " × " + widthData.pageH + " px" : ""),
            h("a", { className: "dca-link", href: imageUrl(projectId, shot.path), target: "_blank", rel: "noreferrer noopener" }, t("openImage")),
          ),
        ),
      )
    }

    function Swatches(props) {
      const list = Array.isArray(props.list) ? props.list.slice(0, props.limit || 12) : []
      if (list.length === 0) return h("span", { className: "dca-muted" }, "—")
      return h(
        "div",
        { className: "dca-swatches" },
        list.map((entry) =>
          h("span", { key: entry.value, className: "dca-swatch", title: entry.value + " ×" + entry.count }, h("i", { style: { background: entry.value } }), entry.value),
        ),
      )
    }

    function Tokens(props) {
      const t = props.t
      const tokens = props.tokens
      if (!tokens || !tokens.design) return h(Notice, { tone: "warn" }, t("noWidths"))
      const design = tokens.design
      const layout = tokens.layouts || {}
      const token = (value, count) => h("span", { key: String(value), className: "dca-token" }, value, count ? h("b", null, " ×" + count) : null)
      return h(
        "div",
        null,
        h(
          "div",
          { className: "dca-grid-3" },
          h(
            "div",
            { className: "dca-card" },
            h("div", { className: "dca-card-head" }, h("h2", { className: "dca-h2" }, t("backgrounds"))),
            h(Swatches, { list: design.backgrounds, t }),
            h("div", { style: { height: 10 } }),
            h("div", { className: "dca-card-head" }, h("h2", { className: "dca-h2" }, t("textColors"))),
            h(Swatches, { list: design.textColors, t }),
          ),
          h(
            "div",
            { className: "dca-card" },
            h("div", { className: "dca-card-head" }, h("h2", { className: "dca-h2" }, t("typography"))),
            h("dl", { className: "dca-kv" },
              h("dt", null, "字体"), h("dd", null, (design.fonts || []).slice(0, 5).map((entry) => entry.value).join("、") || "—"),
              h("dt", null, "字号"), h("dd", { className: "dca-token-list" }, (design.fontSizes || []).slice(0, 14).map((entry) => token(entry.value, entry.count))),
              h("dt", null, "字重"), h("dd", { className: "dca-token-list" }, (design.fontWeights || []).slice(0, 8).map((entry) => token(entry.value, entry.count))),
              h("dt", null, "行高"), h("dd", { className: "dca-token-list" }, (design.lineHeights || []).slice(0, 8).map((entry) => token(entry.value, entry.count))),
            ),
          ),
          h(
            "div",
            { className: "dca-card" },
            h("div", { className: "dca-card-head" }, h("h2", { className: "dca-h2" }, t("spacing"))),
            h("dl", { className: "dca-kv" },
              h("dt", null, "间距"), h("dd", { className: "dca-token-list" }, (design.spacing || []).slice(0, 18).map((entry) => token(entry.value, entry.count))),
              h("dt", null, "圆角"), h("dd", { className: "dca-token-list" }, (design.radii || []).slice(0, 8).map((entry) => token(entry.value, entry.count))),
              h("dt", null, "阴影"), h("dd", { className: "dca-mono" }, (design.shadows || []).slice(0, 3).map((entry) => entry.value).join("；") || "—"),
              h("dt", null, t("breakpoints")), h("dd", { className: "dca-token-list" }, (tokens.breakpoints || []).map((bp) => token(bp.width + "px", 0))),
            ),
          ),
        ),
        h(
          "div",
          { className: "dca-card" },
          h("div", { className: "dca-card-head" }, h("h2", { className: "dca-h2" }, "各宽度布局 · " + (tokens.width || "") + "px")),
          h("div", { style: { overflowX: "auto" } },
            h(
              "table",
              { className: "dca-table" },
              h("thead", null, h("tr", null, ["宽度", "页面尺寸", "h1", "h2", "正文", "区块"].map((label) => h("th", { key: label }, label)))),
              h(
                "tbody",
                null,
                (props.widthData || []).map((row) =>
                  h(
                    "tr",
                    { key: row.width },
                    h("td", null, row.width + "px"),
                    h("td", null, row.pageW + "×" + row.pageH),
                    h("td", null, (row.type && row.type.h1 ? row.type.h1 : 0) + "px"),
                    h("td", null, (row.type && row.type.h2 ? row.type.h2 : 0) + "px"),
                    h("td", null, (row.type && row.type.body ? row.type.body : 0) + "px"),
                    h("td", null, String(row.blocks || 0)),
                  ),
                ),
              ),
            ),
          ),
          (layout.blocks || []).length > 0
            ? h(
                "div",
                { style: { marginTop: 12, overflowX: "auto" } },
                h(
                  "table",
                  { className: "dca-table" },
                  h("thead", null, h("tr", null, ["区块", "标题", "padding(上右下左)", "每行", "内容列宽"].map((label) => h("th", { key: label }, label)))),
                  h(
                    "tbody",
                    null,
                    (layout.blocks || []).slice(0, 16).map((block, index) =>
                      h("tr", { key: index }, h("td", null, block.tag), h("td", null, String(block.heading || "").slice(0, 26)), h("td", { className: "dca-mono" }, (block.pad || []).join(" ")), h("td", null, String(block.perRow || 0)), h("td", null, (block.column || 0) + "px")),
                    ),
                  ),
                ),
              )
            : null,
        ),
        h(
          "div",
          { className: "dca-grid-2", style: { marginTop: 14 } },
          h(
            "div",
            { className: "dca-card" },
            h("div", { className: "dca-card-head" }, h("h2", { className: "dca-h2" }, "页面大纲")),
            h(
              "div",
              { className: "dca-list" },
              (tokens.outline || []).slice(0, 40).map((item, index) =>
                h(
                  "div",
                  { key: index, className: "dca-list-row", style: { paddingLeft: 2 + Math.min(item.depth || 0, 6) * 12 } },
                  h("div", { className: "dca-list-title" }, h("span", { className: "dca-mono" }, item.tag), item.role ? h(Chip, { label: item.role }) : null, h("span", { className: "dca-grow dca-muted", style: { fontWeight: 400 } }, item.text || "")),
                ),
              ),
            ),
          ),
          h(
            "div",
            { className: "dca-card" },
            h("div", { className: "dca-card-head" }, h("h2", { className: "dca-h2" }, "健康与无障碍")),
            h("dl", { className: "dca-kv" },
              h("dt", null, "控制台错误"), h("dd", null, String((tokens.health && tokens.health.consoleErrors) || 0)),
              h("dt", null, "失败请求"), h("dd", null, String((tokens.health && tokens.health.failedRequests) || 0)),
              h("dt", null, "请求数"), h("dd", null, String((tokens.health && tokens.health.requests) || 0)),
              h("dt", null, "landmarks"), h("dd", null, Object.keys((tokens.a11y && tokens.a11y.landmarks) || {}).join("、") || "—"),
              h("dt", null, "无 alt 图片"), h("dd", null, String((tokens.a11y && tokens.a11y.imagesWithoutAlt) || 0)),
              h("dt", null, "无名称控件"), h("dd", null, String((tokens.a11y && tokens.a11y.unnamedControls) || 0)),
              h("dt", null, "图片 / 脚本"), h("dd", null, ((tokens.assets && tokens.assets.images) || 0) + " / " + ((tokens.assets && tokens.assets.scripts) || 0)),
            ),
          ),
        ),
      )
    }

    function EvidenceSection(props) {
      const t = props.t
      const projectId = props.projectId
      const [records, setRecords] = useState([])
      const [total, setTotal] = useState(props.total || 0)
      const [kinds, setKinds] = useState([])
      const [kind, setKind] = useState("")
      const [offset, setOffset] = useState(0)
      const [loading, setLoading] = useState(false)
      const [error, setError] = useState("")
      const pageSize = 10
      const load = useCallback(
        async (nextOffset, nextKind) => {
          setLoading(true)
          setError("")
          try {
            const query = "/api/projects/" + encodeURIComponent(projectId) + "/evidence?offset=" + (nextOffset || 0) + "&limit=" + pageSize + (nextKind ? "&kind=" + encodeURIComponent(nextKind) : "")
            const result = await apiGet(query)
            const data = result.data || {}
            const rows = Array.isArray(data.records) ? data.records : []
            setRecords((current) => (nextOffset === 0 ? rows : current.concat(rows)))
            setTotal(data.total || 0)
            setKinds(Array.isArray(data.kinds) ? data.kinds : [])
            setOffset((nextOffset || 0) + rows.length)
          } catch (e) {
            setError(messageOf(e))
          } finally {
            setLoading(false)
          }
        },
        [projectId],
      )
      useEffect(() => {
        void load(0, kind)
      }, [load, kind])
      return h(
        "div",
        { className: "dca-card" },
        h(
          "div",
          { className: "dca-card-head" },
          h("h2", { className: "dca-h2" }, t("evidence"), h("span", { className: "dca-chip" }, t("evidenceCount", { n: total }))),
          h("span", { style: { flex: 1 } }),
          kinds.length > 0
            ? h(
                "select",
                { className: "dca-select", style: { width: "auto", padding: "3px 8px", fontSize: 11 }, value: kind, onChange: (event) => setKind(event.target.value), "aria-label": t("evidence") },
                h("option", { value: "" }, "全部"),
                kinds.map((name) => h("option", { key: name, value: name }, name)),
              )
            : null,
        ),
        h("p", { className: "dca-sub", style: { marginTop: 0 } }, t("evidenceHint")),
        error ? h(Notice, { tone: "err" }, error) : null,
        records.length === 0 && !loading
          ? h("p", { className: "dca-muted" }, t("evidenceEmpty"))
          : h(
              "div",
              { className: "dca-list" },
              records.map((record) =>
                h(
                  Collapsible,
                  {
                    key: record.id,
                    title: h("span", null, record.title, h("span", { className: "dca-muted" }, "  · " + record.kind)),
                    right: h("span", { className: "dca-row" }, h(Chip, { label: record.confidenceLabel || String(record.confidence), tone: record.confidence >= 0.9 ? "ok" : record.confidence >= 0.8 ? "accent" : "warn" }), h("span", { className: "dca-mono dca-muted" }, Math.round((record.confidence || 0) * 100) + "%")),
                  },
                  h("p", null, record.summary),
                  (record.coverage || []).length > 0 ? h("p", { className: "dca-muted" }, t("coverage") + "：" + record.coverage.join("、")) : null,
                  (record.limitations || []).length > 0 ? h("ul", { className: "dca-bullets" }, record.limitations.map((item, index) => h("li", { key: index }, item))) : null,
                  record.width ? h("p", { className: "dca-mono dca-muted" }, t("width") + "：" + record.width + "px") : null,
                ),
              ),
            ),
        loading ? h(Loading, { label: t("loading") }) : null,
        records.length < total
          ? h("div", { style: { marginTop: 10 } }, h(Btn, { size: "sm", label: t("showMore") + " (" + records.length + "/" + total + ")", onClick: () => void load(offset, kind), disabled: loading }))
          : null,
      )
    }

    function BriefSection(props) {
      const t = props.t
      const projectId = props.projectId
      const briefMeta = props.briefMeta
      const [markdown, setMarkdown] = useState("")
      const [bytes, setBytes] = useState(briefMeta ? briefMeta.bytes : 0)
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState("")
      const [copied, setCopied] = useState(false)
      const [expanded, setExpanded] = useState(false)
      const load = async () => {
        setBusy(true)
        setError("")
        try {
          const result = await apiGet("/api/projects/" + encodeURIComponent(projectId) + "/brief")
          const brief = result.brief || {}
          setMarkdown(brief.markdown || "")
          setBytes(brief.bytes || 0)
        } catch (e) {
          setError(messageOf(e))
        } finally {
          setBusy(false)
        }
      }
      useEffect(() => {
        if (!markdown && props.autoLoad !== false) void load()
      }, [])
      const copy = async () => {
        try {
          await navigator.clipboard.writeText(markdown)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        } catch {
          setError(t("copy") + " 失败")
        }
      }
      return h(
        "div",
        { className: "dca-card" },
        h(
          "div",
          { className: "dca-card-head" },
          h("h2", { className: "dca-h2" }, t("brief"), bytes ? h("span", { className: "dca-chip" }, fmtBytes(bytes)) : null),
          h("span", { style: { flex: 1 } }),
          markdown ? h(Btn, { size: "sm", glyph: "copy", label: copied ? t("copied") : t("copyBrief"), onClick: copy }) : null,
          h(Btn, { size: "sm", glyph: "doc", label: markdown ? t("briefRefresh") : t("briefBtn"), onClick: load, disabled: busy }),
        ),
        h("p", { className: "dca-sub", style: { marginTop: 0 } }, t("briefHint")),
        error ? h(Notice, { tone: "err" }, error) : null,
        busy && !markdown ? h(Loading, { label: t("loading") }) : null,
        !markdown && !busy ? h("p", { className: "dca-muted" }, t("briefEmpty")) : null,
        markdown
          ? h(
              "div",
              null,
              h("pre", { className: "dca-brief" + (expanded ? " dca-brief-full" : "") }, markdown),
              h("div", { style: { marginTop: 8 } }, h(Btn, { size: "sm", variant: "ghost", label: expanded ? t("showLess") : t("showMore"), onClick: () => setExpanded((value) => !value) })),
            )
          : null,
      )
    }

    function toneForScore(score) {
      if (score >= 90) return "ok"
      if (score >= 70) return ""
      return "err"
    }

    function ChecksSection(props) {
      const t = props.t
      const projectId = props.projectId
      const checks = Array.isArray(props.checks) ? props.checks.slice().reverse() : []
      if (checks.length === 0) return h("div", { className: "dca-card" }, h("p", { className: "dca-muted" }, t("checksEmpty")))
      return h(
        "div",
        { className: "dca-card" },
        h("div", { className: "dca-card-head" }, h("h2", { className: "dca-h2" }, t("checks"), h("span", { className: "dca-chip" }, checks.length))),
        h("p", { className: "dca-sub", style: { marginTop: 0 } }, t("checksHint")),
        checks.map((check) =>
          h(
            "div",
            { key: check.round, className: "dca-check" },
            h(
              "details",
              { open: check.round === checks[0].round },
              h(
                "summary",
                { className: "dca-check-head", style: { listStyle: "none" } },
                h("span", { className: "dca-check-score", "data-tone": toneForScore(check.score) }, check.score),
                h("span", null, t("round", { n: check.round }) + " · " + (check.grade || "")),
                h("span", { style: { flex: 1 } }),
                h("span", { className: "dca-muted dca-mono" }, fmtTime(check.at) + " · " + fmtDuration(check.durationMs)),
              ),
              h(
                "div",
                { className: "dca-check-body" },
                (check.perWidth || []).length > 0
                  ? h(
                      "div",
                      null,
                      (check.perWidth || []).map((row) =>
                        h(
                          "div",
                          { key: row.page + "-" + row.width, className: "dca-region" },
                          h("span", { className: "dca-mono", style: { width: 116 } }, (row.page === "/" ? "" : row.page + " ") + row.width + "px"),
                          h("div", { className: "dca-region-bar" }, h(Bar, { value: row.score })),
                          h("span", { className: "dca-mono", style: { width: 44, textAlign: "right" } }, row.score),
                          row.layout !== null && row.layout !== undefined ? h("span", { className: "dca-muted", style: { fontSize: 10 } }, t("layout") + " " + row.layout) : null,
                          row.detail !== null && row.detail !== undefined ? h("span", { className: "dca-muted", style: { fontSize: 10 } }, t("detail") + " " + row.detail) : null,
                          row.token !== null && row.token !== undefined ? h("span", { className: "dca-muted", style: { fontSize: 10 } }, t("token") + " " + row.token) : null,
                        ),
                      ),
                    )
                  : null,
                (check.notes || []).length > 0 ? h("div", null, h("div", { className: "dca-label" }, t("notes")), h("ul", { className: "dca-bullets" }, check.notes.map((note, index) => h("li", { key: index }, note)))) : null,
                (check.designNotes || []).length > 0 ? h("div", null, h("div", { className: "dca-label" }, t("designDiffs")), h("ul", { className: "dca-bullets" }, check.designNotes.slice(0, 10).map((note, index) => h("li", { key: index }, note)))) : null,
                (check.textNotes || []).length > 0
                  ? h("div", null, h("div", { className: "dca-label" }, t("textDiffs")), h("ul", { className: "dca-bullets" }, check.textNotes.slice(0, 4).map((row, index) => h("li", { key: index }, (row.page || "/") + " · " + Math.round(row.similarity || 0) + "%" + ((row.missingHeadings || []).length ? " · 缺标题：" + row.missingHeadings.join("、") : "") + ((row.missingWords || []).length ? " · 缺词：" + row.missingWords.join("、") : "")))))
                  : null,
                (check.structureNotes || []).length > 0
                  ? h("div", null, h("div", { className: "dca-label" }, t("structureDiffs")), h("ul", { className: "dca-bullets" }, check.structureNotes.slice(0, 4).map((row, index) => h("li", { key: index }, (row.page || "/") + " · " + Math.round(row.similarity || 0) + "%" + ((row.missing || []).length ? " · 缺：" + row.missing.map((entry) => (entry[0] || entry) + (entry[1] ? "×" + entry[1] : "")).join("、") : "")))))
                  : null,
                (check.failedClaims || []).length > 0
                  ? h("div", null, h("div", { className: "dca-label" }, t("failedClaims") + " (" + check.failedClaims.length + ")"), h("ul", { className: "dca-bullets" }, check.failedClaims.slice(0, 8).map((claim, index) => h("li", { key: index }, (claim.page || "") + " " + claim.title + (claim.detail ? " — " + claim.detail : "")))))
                  : null,
                (check.unknowns || []).length > 0 ? h("div", null, h("div", { className: "dca-label" }, t("unknowns")), h("ul", { className: "dca-bullets" }, check.unknowns.map((item, index) => h("li", { key: index }, item)))) : null,
                (check.diffImages || check.artifacts || []).length > 0
                  ? h(
                      "div",
                      null,
                      h("div", { className: "dca-label" }, t("diffImages")),
                      h(
                        "div",
                        { className: "dca-diff-grid" },
                        (check.diffImages || check.artifacts || []).slice(0, 9).map((path) =>
                          h(
                            "a",
                            { key: path, className: "dca-diff", href: imageUrl(projectId, path), target: "_blank", rel: "noreferrer noopener" },
                            h("img", { src: imageUrl(projectId, path), alt: path, loading: "lazy" }),
                            h("span", null, path.split("/").pop()),
                          ),
                        ),
                      ),
                    )
                  : null,
              ),
            ),
          ),
        ),
      )
    }

    function ProjectPage(props) {
      const p = props || {}
      const t = p.t
      const detail = p.detail
      const project = detail.project || {}
      const capture = detail.capture
      const checks = Array.isArray(detail.checks) ? detail.checks : []
      const latest = checks.length > 0 ? checks[checks.length - 1] : null
      const meta = statusMeta(project.status, t)
      const [tab, setTab] = useState("shots")
      const [confirming, setConfirming] = useState(false)
      const tabs = [
        { key: "shots", label: t("screenshots") },
        { key: "tokens", label: t("colors") + " / " + t("typography") },
        { key: "evidence", label: t("evidence") },
        { key: "brief", label: t("briefTab") },
        { key: "checks", label: t("checksTab") },
      ]
      const widths = (capture && capture.widths) || (project.capture && project.capture.widths) || []
      return h(
        "div",
        null,
        h(
          "div",
          { className: "dca-row", style: { marginBottom: 8 } },
          h(Btn, { size: "sm", variant: "ghost", glyph: "back", label: t("back"), onClick: p.onBack }),
          h("span", { style: { flex: 1 } }),
          h(Btn, { size: "sm", glyph: "folder", label: t("openFolder"), onClick: () => void p.onOpenFolder(project.id) }),
          h(Btn, { size: "sm", glyph: "external", label: t("preview"), onClick: () => void p.onPreview(project.id) }),
          h(Btn, { size: "sm", glyph: "refresh", label: t("restudy"), onClick: () => void p.onStudy(project.id), disabled: p.busy }),
          h(Btn, { size: "sm", variant: "primary", glyph: "check", label: t("check"), onClick: () => void p.onCheck(project.id), disabled: p.busy }),
          confirming
            ? h(
                "span",
                { className: "dca-row" },
                h("span", { className: "dca-muted", style: { fontSize: 11 } }, t("confirmDelete")),
                h(Btn, { size: "sm", variant: "danger", label: t("delete"), onClick: () => void p.onDelete(project.id) }),
                h(Btn, { size: "sm", variant: "ghost", label: t("cancel"), onClick: () => setConfirming(false) }),
              )
            : h(Btn, { size: "sm", variant: "ghost", glyph: "trash", title: t("deleteProject"), iconOnly: true, onClick: () => setConfirming(true) }),
        ),
        h(
          "div",
          { className: "dca-row", style: { alignItems: "flex-start", gap: 12 } },
          h(
            "div",
            { style: { flex: 1, minWidth: 220 } },
            h("h1", { className: "dca-h1" }, project.name || project.target?.url || ""),
            h("div", { className: "dca-row", style: { marginTop: 5 } },
              h(Chip, { label: meta.label, tone: meta.tone, dot: true }),
              h(Chip, { label: project.mode === "deep" ? t("modeDeep") : t("modeClean") }),
              h("a", { className: "dca-link dca-mono", href: project.target?.url, target: "_blank", rel: "noreferrer noopener", style: { fontSize: 11 } }, project.target?.url || ""),
              project.request ? h("span", { className: "dca-muted", style: { fontSize: 11 } }, "· " + project.request) : null,
            ),
          ),
          latest
            ? h(
                "div",
                { style: { textAlign: "right", flex: "none" } },
                h("div", { className: "dca-summary-score" }, h("b", { style: { color: latest.score >= 90 ? "var(--dca-ok)" : latest.score >= 70 ? "var(--dca-gold)" : "var(--dca-err)" } }, latest.score), h("span", { className: "dca-muted" }, "/ 100 · " + (latest.grade || ""))),
                h("div", { className: "dca-muted", style: { fontSize: 10.5 } }, t("latest") + " · " + fmtTime(latest.at)),
              )
            : null,
        ),
        h(StepsRail, { t, steps: project.steps }),
        h(JobBar, { t, job: p.job }),
        capture && capture.limitations && capture.limitations.length > 0
          ? h("div", { style: { marginTop: 10 } }, h(Notice, { tone: "warn" }, h("b", null, t("limitationsBox") + "："), " " + capture.limitations.slice(0, 4).join("；")))
          : null,
        h(
          "div",
          { className: "dca-tabs", role: "tablist", style: { marginTop: 16 } },
          tabs.map((item) => h("button", { key: item.key, type: "button", role: "tab", className: "dca-tabbtn", "aria-selected": tab === item.key ? "true" : "false", onClick: () => setTab(item.key) }, item.label)),
        ),
        tab === "shots" ? h(ScreenshotGallery, { t, projectId: project.id, pages: capture ? capture.pages : [], widths }) : null,
        tab === "tokens" ? h(Tokens, { t, tokens: detail.tokens, widthData: capture && capture.pages && capture.pages[0] ? capture.pages[0].widthData : [] }) : null,
        tab === "evidence" ? h(EvidenceSection, { t, projectId: project.id, total: detail.evidence ? detail.evidence.total : 0 }) : null,
        tab === "brief" ? h(BriefSection, { t, projectId: project.id, briefMeta: project.brief }) : null,
        tab === "checks" ? h(ChecksSection, { t, projectId: project.id, checks }) : null,
        h("div", { className: "dca-footer-note" }, "project " + project.id + " · " + t("updatedAt") + " " + fmtTime(project.updatedAt)),
      )
    }

    /* ------------------------------------------------------------------ */
    /* Panel shell + data flow                                             */
    /* ------------------------------------------------------------------ */

    function RebuildIcon(props) {
      const size = props && props.size ? props.size : 20
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": "true" },
        h("path", { d: "M14.6 4.2 18.8 5.1l-0.9 4.2-5-1.1z", fill: "#ffd479" }),
        h("path", { d: "M9.1 8.5 16.6 16l-2.6 2.6L6.5 11.1z", fill: "currentColor", opacity: ".92" }),
        h("path", { d: "M6.7 11.3 12 16.6l-2.3 2.3a1.3 1.3 0 0 1-1.8 0l-3.6-3.6a1.3 1.3 0 0 1 0-1.8z", fill: "currentColor", opacity: ".55" }),
        h("circle", { cx: 7.4, cy: 17.6, r: 1.6, fill: "none", stroke: "#7fd6c2", strokeWidth: 1.2 }),
      )
    }

    function RebuildPanel(props) {
      const outerT = typeof props.t === "function" ? props.t : makeT("zh")
      const [lang, setLang] = useState(readLang())
      const t = useMemo(() => makeT(lang), [lang])
      const [stateData, setStateData] = useState(null)
      const [detail, setDetail] = useState(null)
      const [route, setRoute] = useState({ page: "overview", projectId: "" })
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState("")
      const [notice, setNotice] = useState(null)

      const notify = useCallback((text, tone) => {
        setNotice({ id: Date.now(), text: String(text || ""), tone: tone === "err" ? "err" : "ok" })
      }, [])

      const loadState = useCallback(async () => {
        try {
          const result = await apiGet("/api/state")
          setStateData(result.data || {})
          setError("")
        } catch (e) {
          setError(messageOf(e))
        }
      }, [])

      const loadDetail = useCallback(async (projectId) => {
        if (!projectId) return null
        const result = await apiGet("/api/projects/" + encodeURIComponent(projectId))
        setDetail(result.data || null)
        return result.data || null
      }, [])

      useEffect(() => {
        void (async () => {
          setLoading(true)
          await loadState()
          setLoading(false)
        })()
      }, [loadState])

      useEffect(() => {
        if (!route.projectId) {
          setDetail(null)
          return
        }
        setLoading(true)
        loadDetail(route.projectId)
          .catch((e) => setError(messageOf(e)))
          .finally(() => setLoading(false))
      }, [route.projectId, loadDetail])

      const job = detail && detail.job ? detail.job : null
      const jobStatus = job ? job.status : ""
      useEffect(() => {
        if (!route.projectId || jobStatus !== "running") return
        const timer = setInterval(() => {
          void loadDetail(route.projectId).then((next) => {
            if (next && next.job && next.job.status !== "running") void loadState()
          })
        }, 1400)
        return () => clearInterval(timer)
      }, [route.projectId, jobStatus, loadDetail, loadState])

      useEffect(() => {
        if (!notice) return
        const timer = setTimeout(() => setNotice(null), 4200)
        return () => clearTimeout(timer)
      }, [notice])

      const chooseLang = (next) => {
        if (next === lang) return
        writeLang(next)
        setLang(next)
      }

      const openProject = (projectId) => setRoute({ page: "project", projectId })

      const onCreated = async (projectId) => {
        notify(t("jobQueued"))
        openProject(projectId)
        await loadState()
      }

      const startJob = async (projectId, kind) => {
        try {
          setError("")
          const path = "/api/projects/" + encodeURIComponent(projectId) + (kind === "study" ? "/study" : "/check")
          await apiPost(path, {})
          notify(t("jobQueued"))
          await loadDetail(projectId)
          await loadState()
        } catch (e) {
          notify(messageOf(e), "err")
          await loadDetail(projectId).catch(() => {})
        }
      }

      const onStudy = (projectId) => void startJob(projectId, "study")
      const onCheck = (projectId) => void startJob(projectId, "check")

      const onDelete = async (projectId) => {
        try {
          await apiPost("/api/projects/" + encodeURIComponent(projectId) + "/delete", {})
          notify(t("delete") + " ✓")
          setRoute({ page: "overview", projectId: "" })
          setDetail(null)
          await loadState()
        } catch (e) {
          notify(messageOf(e), "err")
        }
      }

      const onOpenFolder = async (projectId) => {
        try {
          const result = await apiPost("/api/projects/" + encodeURIComponent(projectId) + "/open", {})
          if (result.opened === false) notify(result.reason || t("error"), "err")
        } catch (e) {
          notify(messageOf(e), "err")
        }
      }

      const onPreview = async (projectId) => {
        try {
          const result = await apiPost("/api/projects/" + encodeURIComponent(projectId) + "/preview", {})
          const url = result.preview && result.preview.url
          if (url) window.open(url, "_blank", "noopener,noreferrer")
          else notify(t("appMissing"), "err")
        } catch (e) {
          notify(messageOf(e), "err")
        }
      }

      const busy = jobStatus === "running"
      const browserMissing = stateData && stateData.browser && stateData.browser.available === false

      let body = null
      if (route.page === "project") {
        if (!detail) body = h(Loading, { label: t("loading") })
        else body = h(ProjectPage, { t, detail, job, busy, onBack: () => setRoute({ page: "overview", projectId: "" }), onStudy, onCheck, onDelete, onOpenFolder, onPreview })
      } else if (!stateData) {
        body = h(Loading, { label: t("loading") })
      } else {
        body = h(OverviewPage, { t, data: stateData, onCreated, onOpenProject: openProject, onRefresh: () => void loadState() })
      }

      return h(
        "div",
        { className: "dca-root" },
        h("style", null, STYLES),
        h(
          "div",
          { className: "dca-shell" },
          h(
            "header",
            { className: "dca-topbar" },
            h(
              "div",
              { className: "dca-brand" },
              h("div", { className: "dca-brand-mark" }, h(RebuildIcon, { size: 18 })),
              h("div", null, h("div", { className: "dca-brand-title" }, outerT("panel") === "panel" ? t("appTitle") : t("appTitle")), h("div", { className: "dca-brand-sub" }, t("appSubtitle") + " · v" + VERSION)),
            ),
            h("div", { className: "dca-topbar-spacer" }),
            h(
              "div",
              { className: "dca-topbar-meta" },
              stateData && stateData.browser && stateData.browser.product
                ? h(Chip, { label: stateData.browser.product.split("/")[0], tone: "ok", dot: true })
                : null,
              h(Btn, { size: "sm", variant: "ghost", glyph: "refresh", label: t("refresh"), onClick: () => { void loadState(); if (route.projectId) void loadDetail(route.projectId) } }),
              h(
                "div",
                { className: "dca-row", style: { gap: 4 } },
                h("button", { type: "button", className: "dca-tab", "aria-pressed": lang === "zh", onClick: () => chooseLang("zh"), title: "中文" }, "中"),
                h("button", { type: "button", className: "dca-tab", "aria-pressed": lang === "en", onClick: () => chooseLang("en"), title: "English" }, "EN"),
              ),
            ),
          ),
          h(
            "main",
            { className: "dca-main" },
            h(
              "div",
              { className: "dca-content" },
              error ? h(Notice, { tone: "err" }, error) : null,
              notice ? h(Notice, { tone: notice.tone === "err" ? "err" : "ok" }, notice.text) : null,
              browserMissing ? h(Notice, { tone: "warn" }, t("noBrowser")) : null,
              loading && route.page === "project" ? h(Loading, { label: t("loading") }) : body,
            ),
          ),
        ),
      )
    }

    /* ------------------------------------------------------------------ */
    /* Plugin registration                                                 */
    /* ------------------------------------------------------------------ */

    return {
      inject: ["slots", "locale"],
      apply(ctx) {
        ctx.effect(function () {
          return ctx.locale.register(NS, DICTIONARIES)
        }, "dsh-site-rebuild: dictionaries")
        const t = ctx.locale.bind(NS)

        ctx.slots.inject("sidebar.panellist", function () {
          return ctx.slots.register(
            {
              name: "sidebar.panellist",
              id: NS,
              order: 27,
              label: function () {
                return t("panel")
              },
              locale: NS,
            },
            function (props) {
              return h(RebuildIcon, { size: typeof props?.size === "number" ? props.size : 20 })
            },
          )
        })

        ctx.slots.inject("main", function () {
          return ctx.slots.register(
            {
              name: "main",
              key: NS,
              locale: NS,
            },
            function (slotProps) {
              const props = slotProps || {}
              return h(RebuildPanel, { t: typeof props.t === "function" ? props.t : t })
            },
          )
        })
      },
      /** Pure helpers exposed for the headless unit tests (harmless at runtime). */
      __test__: {
        DICTIONARIES,
        makeT,
        fmtTime,
        fmtDuration,
        fmtBytes,
        statusMeta,
        stepState,
      },
    }
  },
})
