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
