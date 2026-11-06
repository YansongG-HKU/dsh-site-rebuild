/**
 * dsh-site-rebuild — Host plugin entry.
 *
 * Owns the project store under `<DSH_HOME>/site-rebuild`, one shared
 * headless-browser pool, the study/check orchestration, six `craft_*` tools,
 * one short system-prompt section, and the loopback panel routes.
 *
 * Nothing here patches the harness or another plugin. A headless profile still
 * gets the tools; a profile without a browser gets clear errors instead of a
 * broken activation.
 */

import { homedir } from 'node:os'
import { join } from 'node:path'
import { BrowserPool, findBrowser } from './lib/browser.js'
import { resolveConfig } from './lib/config.js'
import { registerPanel } from './lib/panel.js'
import { createService } from './lib/service.js'
import { createStore } from './lib/store.js'
import { createTools } from './lib/tools.js'
import { messageOf } from './lib/util.js'

/** `tools` is required; the web panel is optional. */
export const inject = ['tools']

/** Package / loader row name. */
export const name = 'dsh-site-rebuild'

/** The short prompt section that makes the workflow discoverable. */
const PROMPT_SECTION = [
  '网站复刻 (Site Rebuild) is installed. When the user asks to copy, clone, recreate, rebuild or "做一版" a website — or to understand how a site is built —',
  'use the native workflow: craft_study(url, request) → read craft_brief → write the rebuild into the project app/ folder → craft_check → fix → check again.',
  'Default to clean room: work only from the brief, the measured values and the screenshots; never fetch or copy the original site\'s source, scripts, logos, photos,',
  'fonts or text. Write your own equivalent copy and placeholder assets. Deep mode only when the user explicitly asks to inspect the source.',
  'Report the score, the remaining differences and what was recreated; do not claim a score you did not run. The Site Rebuild (网站复刻) sidebar panel shows the same projects,',
  'screenshots, evidence and check rounds for the user.',
].join(' ')

/** Resolve the plugin's data directory. */
function resolveDataDir(config) {
  if (typeof config?.dataDir === 'string' && config.dataDir.trim().length > 0) return config.dataDir.trim()
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'site-rebuild')
}

/** A logger that never throws. */
function createLog(ctx) {
  const write = (level, message) => {
    try {
      const logger = ctx?.logger
      if (typeof logger?.[level] === 'function') logger[level](`[dsh-site-rebuild] ${message}`)
    } catch {
      /* logging never breaks activation */
    }
  }
  return {
    info: (message) => write('info', message),
    warn: (message) => write('warn', message),
  }
}

/**
 * Plugin activation.
 * @param {object} ctx Cordis context with `tools`
 * @param {unknown} rowConfig loader row config
 */
export function apply(ctx, rowConfig) {
  const log = createLog(ctx)
  const config = resolveConfig(rowConfig)
  const dataDir = resolveDataDir(config)
  let store
  let pool
  let service
  let panelDispose = null
  let disposed = false

  try {
    store = createStore({ dir: dataDir, log })
    pool = new BrowserPool({ browserPath: config.browserPath, blockedHosts: config.blockedHosts, log })
    service = createService({ store, pool, config, log })
    // Create the store root in the background; calls await ensureDir lazily.
    void store.init().catch((error) => log.warn(`could not create the data directory: ${messageOf(error)}`))
  } catch (error) {
    log.warn(`could not initialise the plugin; staying inert: ${messageOf(error)}`)
    return () => {}
  }

  // Agent tools.
  let registered = 0
  try {
    for (const definition of createTools({ service, config, log })) {
      try {
        ctx.effect(() => ctx.tools.register(definition), `dsh-site-rebuild: ${definition.name}`)
        registered += 1
      } catch (error) {
        log.warn(`could not register ${definition.name}: ${messageOf(error)}`)
      }
    }
  } catch (error) {
    log.warn(`could not build the tool definitions: ${messageOf(error)}`)
  }

  // Discoverability prompt section (small, passive).
  try {
    if (typeof ctx.systemPrompt?.section === 'function') {
      ctx.effect(
        () => ctx.systemPrompt.section({ name: 'dsh-site-rebuild', order: 9180, interpolate: false, text: () => PROMPT_SECTION }),
        'dsh-site-rebuild: prompt section',
      )
    }
  } catch (error) {
    log.warn(`could not register the prompt section: ${messageOf(error)}`)
  }

  // Panel routes (optional: headless profiles have no web server).
  try {
    panelDispose = registerPanel({ ctx, service, log })
  } catch (error) {
    log.warn(`could not register the panel routes: ${messageOf(error)}`)
  }

  const browser = findBrowser(config.browserPath)
  log.info(
    browser.path
      ? `active: ${registered} tools, panel ${'/' + 'dsh-site-rebuild'}, browser ${browser.path}, data ${dataDir}`
      : `active without a browser: ${registered} tools; study/check will report that Chrome or Edge is required`,
  )

  return () => {
    if (disposed) return
    disposed = true
    try {
      panelDispose?.()
    } catch {
      /* best effort */
    }
    void service
      ?.dispose()
      .catch((error) => log.warn(`service disposal failed: ${messageOf(error)}`))
      .then(() => pool?.dispose().catch((error) => log.warn(`browser disposal failed: ${messageOf(error)}`)))
  }
}
