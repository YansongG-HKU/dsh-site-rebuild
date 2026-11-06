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
