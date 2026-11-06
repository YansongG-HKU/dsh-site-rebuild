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
