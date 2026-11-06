/**
 * dsh-site-rebuild — constants, limits, and configuration resolution.
 *
 * Everything the engine can tune lives here so the tools, the panel and the
 * tests agree on one budget. No host files are ever read.
 */

/** Package / loader row / panel key. */
export const PLUGIN_NAME = 'dsh-site-rebuild'
/** Route prefix owned by the Host half (also the Client fetch base). */
export const ROUTE_PREFIX = '/dsh-site-rebuild'
/** Request header that marks a call as coming from this plugin's page code. */
export const REQUEST_HEADER = 'x-dsh-site-rebuild'
/** Persisted project schema version. */
export const SCHEMA_VERSION = 1
/** Default viewports compared by capture and check. */
export const DEFAULT_WIDTHS = Object.freeze([1440, 768, 375])
/** Viewport heights paired with DEFAULT_WIDTHS (desktop, tablet, phone). */
export const DEFAULT_HEIGHTS = Object.freeze({ 1440: 900, 768: 900, 375: 812 })
/** Weight of each viewport in a page's score (normalised at use). */
export const WIDTH_WEIGHTS = Object.freeze({ 1440: 0.45, 768: 0.3, 375: 0.25 })

/** Hard limits shared by the engine, the routes and the tools. */
export const LIMITS = Object.freeze({
  /** Longest page height captured, in CSS px (memory guard). */
  maxPageHeight: 12000,
  /** Longest page width captured, in CSS px. */
  maxPageWidth: 2560,
  /** Nodes kept in a capture's structure tree. */
  maxNodes: 4000,
  /** Depth of the kept structure tree. */
  maxTreeDepth: 12,
  /** Text kept from one page, in characters. */
  maxTextChars: 30000,
  /** Links kept from one page. */
  maxLinks: 300,
  /** Extra same-origin pages captured besides the start page. */
  maxPages: 12,
  /** Evidence records kept per project. */
  maxEvidence: 400,
  /** Bytes per evidence record's serialised `data`. */
  maxEvidenceBytes: 512 * 1024,
  /** Bytes of a tool's returned prompt content. */
  toolContentBytes: 64 * 1024,
  /** Bytes of a generated build brief. */
  briefBytes: 48 * 1024,
  /** JSON request bodies from the panel. */
  maxBodyBytes: 8 * 1024 * 1024,
  /** Screenshot bytes served by the panel (one file). */
  maxImageBytes: 24 * 1024 * 1024,
  /** Projects kept in the store before creation is refused. */
  maxProjects: 200,
  /** Checks kept per project (oldest pruned). */
  maxChecks: 30,
  /** Browser idle time before the process is released. */
  browserIdleMs: 90 * 1000,
  /** Wall-clock limit for one study/check job. */
  jobTimeoutMs: 180 * 1000,
  /** Navigation settle limit. */
  settleTimeoutMs: 20000,
  /** Quiet network window that counts as settled. */
  networkQuietMs: 220,
  /** Longest a single CDP command may take. */
  cdpTimeoutMs: 30000,
})

/** Analytics/tracker hosts blocked during capture so pages settle and scores stay stable. */
export const DEFAULT_BLOCKED_HOSTS = Object.freeze([
  'google-analytics.com',
  'googletagmanager.com',
  'googletagservices.com',
  'doubleclick.net',
  'facebook.net',
  'facebook.com',
  'hotjar.com',
  'hotjar.io',
  'segment.io',
  'segment.com',
  'mixpanel.com',
  'amplitude.com',
  'fullstory.com',
  'clarity.ms',
  'sentry.io',
  'bugsnag.com',
  'intercom.io',
  'intercomcdn.com',
  'drift.com',
  'criteo.com',
  'taboola.com',
  'outbrain.com',
  'quantserve.com',
  'scorecardresearch.com',
])

/** What a fresh project records when no config is supplied. */
export const DEFAULT_CONFIG = Object.freeze({
  dataDir: '',
  widths: DEFAULT_WIDTHS,
  maxPages: 3,
  openStates: false,
  browserPath: '',
  blockedHosts: DEFAULT_BLOCKED_HOSTS,
  includeDiffImages: true,
  followRedirects: true,
  cleanRoom: true,
})

/** A supported viewport width stays inside sane browser bounds. */
function validWidth(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const w = Math.round(n)
  return w >= 240 && w <= 3840 ? w : null
}

/** Normalise a widths argument: de-duplicated, ascending, 1-6 entries. */
export function normalizeWidths(value) {
  const source = Array.isArray(value) ? value : value === undefined || value === null ? DEFAULT_WIDTHS : [value]
  const seen = new Set()
  const out = []
  for (const item of source) {
    const w = validWidth(item)
    if (w === null || seen.has(w)) continue
    seen.add(w)
    out.push(w)
  }
  if (out.length === 0) return [...DEFAULT_WIDTHS]
  out.sort((a, b) => b - a)
  return out.slice(0, 6)
}

/** Viewport height for a width: the default pair, else a 16:10-ish height. */
export function heightForWidth(width) {
  return DEFAULT_HEIGHTS[width] ?? Math.max(480, Math.round(width * 0.62))
}

/** Resolve the loader row's config into the engine's budget. Never throws. */
export function resolveConfig(raw) {
  const config = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const widths = normalizeWidths(config.widths)
  const maxPagesRaw = Number(config.maxPages)
  const maxPages = Number.isFinite(maxPagesRaw) ? Math.min(Math.max(0, Math.round(maxPagesRaw)), LIMITS.maxPages) : DEFAULT_CONFIG.maxPages
  return {
    dataDir: typeof config.dataDir === 'string' ? config.dataDir.trim() : '',
    widths,
    maxPages,
    openStates: config.openStates === true,
    browserPath: typeof config.browserPath === 'string' ? config.browserPath.trim() : '',
    blockedHosts: Array.isArray(config.blockedHosts)
      ? config.blockedHosts.filter((host) => typeof host === 'string' && host.trim().length > 0).map((host) => host.trim())
      : [...DEFAULT_BLOCKED_HOSTS],
    includeDiffImages: config.includeDiffImages !== false,
    followRedirects: config.followRedirects !== false,
    cleanRoom: config.cleanRoom !== false,
  }
}

/** Score weights for one width, falling back to equal weights. */
export function weightForWidth(width, widths) {
  const listed = WIDTH_WEIGHTS[width]
  if (typeof listed === 'number') return listed
  if (!Array.isArray(widths) || widths.length === 0) return 0.3
  return 1 / widths.length
}
