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
