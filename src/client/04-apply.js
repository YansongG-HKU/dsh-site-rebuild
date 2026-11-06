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
