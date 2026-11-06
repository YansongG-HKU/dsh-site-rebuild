/**
 * dsh-site-rebuild — the in-page extraction script.
 *
 * Runs inside the captured page through `Runtime.evaluate`. It reads only what a
 * visitor can see and measure: geometry, computed styles, visible text, links,
 * form shapes, asset URLs, CSS media-query widths and accessibility landmarks.
 * It never reads files, JavaScript sources or network bodies. Everything is
 * bounded so a hostile page cannot exhaust the capture.
 *
 * The script is a self-contained, side-effect-free function expression returning
 * one JSON value.
 */

export const EXTRACT_SCRIPT = String.raw`(() => {
  const MAX_NODES = 2500
  const MAX_DEPTH = 12
  const MAX_TEXT = 30000
  const MAX_LINKS = 300
  const MAX_OUTLINE = 600
  const MAX_LIST = 120
  const abs = (value) => { try { return new URL(String(value), location.href).href } catch { return String(value === undefined || value === null ? '' : value) } }
  const textOf = (element) => {
    const raw = element && typeof element.innerText === 'string' ? element.innerText : element ? element.textContent : ''
    return String(raw || '').replace(/\s+/g, ' ').trim()
  }
  const px = (value) => {
    const n = parseFloat(String(value || ''))
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
  }
  const visible = (element) => {
    if (!element || !(element instanceof Element)) return false
    const style = getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false
    if (px(style.opacity) === 0) return false
    const rect = element.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return false
    return true
  }
  const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'META', 'LINK', 'TITLE', 'HEAD', 'BR', 'WBR'])
  const roleOf = (element) => {
    const explicit = element.getAttribute && element.getAttribute('role')
    if (explicit) return explicit.trim().split(/\s+/)[0].toLowerCase()
    const tag = element.tagName.toLowerCase()
    const table = { header: 'banner', nav: 'navigation', main: 'main', footer: 'contentinfo', aside: 'complementary', form: 'form', h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading', img: 'img', button: 'button', a: 'link', input: 'textbox', select: 'combobox', textarea: 'textbox', ul: 'list', ol: 'list', section: 'region', article: 'article', dialog: 'dialog' }
    return table[tag] || ''
  }
  const styleSubset = (element) => {
    const s = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    const radius = s.borderTopLeftRadius && s.borderTopLeftRadius !== '0px' ? px(s.borderTopLeftRadius) : 0
    const gap = px(s.rowGap || s.gap)
    return {
      color: s.color,
      bg: s.backgroundColor === 'rgba(0, 0, 0, 0)' ? '' : s.backgroundColor,
      bd: s.borderTopColor && px(s.borderTopWidth) > 0 ? s.borderTopColor : '',
      ff: s.fontFamily,
      fs: px(s.fontSize),
      fw: s.fontWeight,
      lh: s.lineHeight === 'normal' ? 0 : px(s.lineHeight),
      ls: px(s.letterSpacing),
      mt: px(s.marginTop), mr: px(s.marginRight), mb: px(s.marginBottom), ml: px(s.marginLeft),
      pt: px(s.paddingTop), pr: px(s.paddingRight), pb: px(s.paddingBottom), pl: px(s.paddingLeft),
      rad: radius,
      sh: s.boxShadow && s.boxShadow !== 'none' ? String(s.boxShadow).slice(0, 80) : '',
      gap,
      gtc: s.gridTemplateColumns && s.gridTemplateColumns !== 'none' ? String(s.gridTemplateColumns).slice(0, 120) : '',
      fd: s.flexDirection,
      ta: s.textAlign,
      pos: s.position,
      ovx: s.overflowX,
      bgi: s.backgroundImage && s.backgroundImage !== 'none' ? String(s.backgroundImage).slice(0, 160) : '',
      x: Math.round(rect.x + scrollX),
      y: Math.round(rect.y + scrollY),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
    }
  }

  const nodes = []
  const outline = []
  const headings = []
  const walk = (element, depth, path) => {
    if (nodes.length >= MAX_NODES || depth > MAX_DEPTH) return
    if (!(element instanceof Element) || skip.has(element.tagName)) return
    if (!visible(element)) return
    const tag = element.tagName.toLowerCase()
    const styles = styleSubset(element)
    const ownText = element.childElementCount === 0 ? textOf(element).slice(0, 80) : ''
    nodes.push({
      depth,
      path,
      tag,
      id: element.id ? String(element.id).slice(0, 60) : '',
      classes: String(element.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join(' ').slice(0, 80),
      role: roleOf(element),
      text: ownText,
      styles,
    })
    if (outline.length < MAX_OUTLINE && (['header', 'nav', 'main', 'footer', 'aside', 'section', 'article', 'form', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'img', 'video', 'button', 'a', 'input', 'select', 'textarea'].includes(tag))) {
      outline.push({ tag, role: roleOf(element), text: (tag === 'img' ? (element.getAttribute('alt') || '') : (tag === 'a' || tag === 'button' ? textOf(element) : textOf(element).slice(0, 80))).slice(0, 80), x: styles.x, y: styles.y, w: styles.w, h: styles.h, depth })
    }
    for (let index = 0; index < element.children.length; index += 1) walk(element.children[index], depth + 1, path + '/' + index)
  }
  walk(document.body, 0, 'body')

  const all = document.querySelectorAll('h1,h2,h3,h4,h5,h6')
  for (let i = 0; i < all.length && headings.length < 120; i += 1) {
    const element = all[i]
    if (!visible(element)) continue
    const rect = element.getBoundingClientRect()
    headings.push({ tag: element.tagName.toLowerCase(), text: textOf(element).slice(0, 140), x: Math.round(rect.x + scrollX), y: Math.round(rect.y + scrollY), size: px(getComputedStyle(element).fontSize) })
  }

  const links = []
  const anchors = document.querySelectorAll('a[href]')
  for (let i = 0; i < anchors.length && links.length < MAX_LINKS; i += 1) {
    const element = anchors[i]
    if (!visible(element)) continue
    const href = abs(element.getAttribute('href'))
    if (!href || href.startsWith('javascript:')) continue
    links.push({ href, text: textOf(element).slice(0, 70), x: Math.round(element.getBoundingClientRect().x + scrollX), y: Math.round(element.getBoundingClientRect().y + scrollY) })
  }

  const forms = []
  const fields = document.querySelectorAll('input,select,textarea')
  for (let i = 0; i < fields.length && forms.length < MAX_LIST; i += 1) {
    const element = fields[i]
    if (!visible(element)) continue
    let label = ''
    try {
      if (element.id) { const labelElement = document.querySelector('label[for="' + CSS.escape(element.id) + '"]'); if (labelElement) label = textOf(labelElement) }
      const wrap = element.closest('label')
      if (!label && wrap) label = textOf(wrap)
    } catch { /* selector edge cases are fine to skip */ }
    forms.push({
      kind: element.tagName.toLowerCase(),
      type: String(element.getAttribute('type') || '').toLowerCase(),
      name: String(element.getAttribute('name') || ''),
      placeholder: String(element.getAttribute('placeholder') || ''),
      label: label.slice(0, 80),
      required: element.required === true,
      disabled: element.disabled === true,
      options: element.tagName === 'SELECT' ? Array.from(element.options).slice(0, 20).map((option) => String(option.text).slice(0, 40)) : undefined,
    })
  }

  const assetSet = { images: new Set(), stylesheets: new Set(), scripts: new Set(), media: new Set(), fonts: new Set() }
  const images = []
  const imgElements = document.querySelectorAll('img,picture source')
  for (let i = 0; i < imgElements.length && images.length < MAX_LIST * 2; i += 1) {
    const element = imgElements[i]
    const src = element.currentSrc || element.src || element.getAttribute('srcset')
    if (src) { assetSet.images.add(abs(String(src).split(',')[0].trim().split(/\s+/)[0])); images.push({ src: abs(String(element.currentSrc || element.getAttribute('src') || '').split(',')[0].trim().split(/\s+/)[0]), alt: String(element.getAttribute('alt') || '').slice(0, 80), w: element.naturalWidth || 0, h: element.naturalHeight || 0 }) }
  }
  document.querySelectorAll('link[rel~="stylesheet"][href]').forEach((element) => assetSet.stylesheets.add(abs(element.getAttribute('href'))))
  document.querySelectorAll('script[src]').forEach((element) => assetSet.scripts.add(abs(element.getAttribute('src'))))
  document.querySelectorAll('video source[src],video[src],audio source[src]').forEach((element) => assetSet.media.add(abs(element.getAttribute('src'))))
  let fontFamilies = []
  try { fontFamilies = Array.from(document.fonts).map((face) => face.family) } catch { fontFamilies = [] }
  for (const node of nodes) {
    const match = /url\((["']?)([^"')]+)\1\)/g
    let found
    while ((found = match.exec(node.styles.bgi))) assetSet.images.add(abs(found[2]))
    if (node.styles.ff) assetSet.fonts.add(node.styles.ff)
  }
  for (const family of fontFamilies) assetSet.fonts.add(family)

  const landmarks = {}
  document.querySelectorAll('header,nav,main,footer,aside,form,[role="banner"],[role="navigation"],[role="main"],[role="contentinfo"],[role="complementary"],[role="search"]').forEach((element) => {
    if (!visible(element)) return
    const key = roleOf(element) || element.tagName.toLowerCase()
    landmarks[key] = (landmarks[key] || 0) + 1
  })
  let imagesWithoutAlt = 0
  document.querySelectorAll('img').forEach((element) => { if (visible(element) && !String(element.getAttribute('alt') || '').trim()) imagesWithoutAlt += 1 })
  let unnamedControls = 0
  document.querySelectorAll('button,a[href],input[type="submit"],input[type="button"]').forEach((element) => {
    if (!visible(element)) return
    const name = String(element.getAttribute('aria-label') || element.getAttribute('title') || textOf(element) || (element.getAttribute('type') === 'submit' ? element.value : '') || '').trim()
    if (!name) unnamedControls += 1
  })

  const customProperties = {}
  try {
    const computed = getComputedStyle(document.documentElement)
    for (let i = 0; i < computed.length && i < 400; i += 1) {
      const name = computed[i]
      if (name.startsWith('--')) customProperties[name] = String(computed.getPropertyValue(name)).trim().slice(0, 120)
    }
  } catch { /* custom properties are optional */ }

  let stylesheetCount = 0
  let inaccessibleStylesheets = 0
  let ruleCount = 0
  const mediaQueries = new Set()
  try {
    const sheets = Array.from(document.styleSheets)
    stylesheetCount = sheets.length
    const visit = (rules) => {
      for (let i = 0; i < rules.length && ruleCount < 20000; i += 1) {
        const rule = rules[i]
        ruleCount += 1
        if (rule.type === CSSRule.MEDIA_RULE || (rule.media && rule.media.mediaText)) {
          const text = String(rule.media && rule.media.mediaText ? rule.media.mediaText : '')
          if (text) mediaQueries.add(text.slice(0, 160))
          if (rule.cssRules) visit(rule.cssRules)
        } else if (rule.cssRules) visit(rule.cssRules)
      }
    }
    for (const sheet of sheets) {
      try { visit(sheet.cssRules) } catch { inaccessibleStylesheets += 1 }
    }
  } catch { /* stylesheet inspection is best effort */ }

  let navigation = null
  try { navigation = performance.getEntriesByType('navigation')[0] || null } catch { navigation = null }
  let resourceCount = 0
  let transferBytes = 0
  try {
    const resources = performance.getEntriesByType('resource')
    resourceCount = resources.length
    for (const entry of resources) transferBytes += entry.transferSize || 0
  } catch { /* performance entries are best effort */ }

  let animatedElements = 0
  try { animatedElements = document.getAnimations({ subtree: true }).length } catch { animatedElements = 0 }
  let iframeCount = 0
  let canvasCount = 0
  let videoCount = 0
  let lazyImages = 0
  document.querySelectorAll('iframe').forEach(() => { iframeCount += 1 })
  document.querySelectorAll('canvas').forEach(() => { canvasCount += 1 })
  document.querySelectorAll('video').forEach(() => { videoCount += 1 })
  document.querySelectorAll('img[loading="lazy"]').forEach(() => { lazyImages += 1 })
  const fixedCount = nodes.filter((node) => node.styles.pos === 'fixed' || node.styles.pos === 'sticky').length

  return {
    ok: true,
    url: location.href,
    title: String(document.title || '').slice(0, 200),
    lang: String(document.documentElement.lang || '').slice(0, 20),
    meta: {
      description: String(document.querySelector('meta[name="description"]') && document.querySelector('meta[name="description"]').content || '').slice(0, 400),
      ogTitle: String(document.querySelector('meta[property="og:title"]') && document.querySelector('meta[property="og:title"]').content || '').slice(0, 200),
      ogImage: abs(String(document.querySelector('meta[property="og:image"]') && document.querySelector('meta[property="og:image"]').content || '')),
      favicon: abs(String(document.querySelector('link[rel~="icon"]') && document.querySelector('link[rel~="icon"]').href || '')),
      viewport: String(document.querySelector('meta[name="viewport"]') && document.querySelector('meta[name="viewport"]').content || '').slice(0, 200),
      canonical: abs(String(document.querySelector('link[rel="canonical"]') && document.querySelector('link[rel="canonical"]').href || '')),
    },
    page: {
      w: Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0),
      h: Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0),
      vw: innerWidth,
      vh: innerHeight,
      dpr: window.devicePixelRatio || 1,
      elements: document.querySelectorAll('*').length,
      bodyBg: document.body ? getComputedStyle(document.body).backgroundColor : '',
      bodyColor: document.body ? getComputedStyle(document.body).color : '',
      bodyFont: document.body ? getComputedStyle(document.body).fontFamily : '',
    },
    text: String(document.body ? document.body.innerText : '').replace(/\n{3,}/g, '\n\n').slice(0, MAX_TEXT),
    headings,
    links,
    nodes,
    outline,
    forms,
    images,
    assets: {
      images: Array.from(assetSet.images).slice(0, 200),
      stylesheets: Array.from(assetSet.stylesheets).slice(0, 60),
      scripts: Array.from(assetSet.scripts).slice(0, 60),
      media: Array.from(assetSet.media).slice(0, 40),
      fonts: Array.from(assetSet.fonts).slice(0, 60),
    },
    a11y: {
      lang: String(document.documentElement.lang || ''),
      landmarks,
      headingOutline: headings.map((heading) => ({ tag: heading.tag, text: heading.text })),
      imagesWithoutAlt,
      unnamedControls,
      imageCount: document.querySelectorAll('img').length,
      linkCount: anchors.length,
      buttonCount: document.querySelectorAll('button').length,
    },
    css: {
      stylesheetCount,
      inaccessibleStylesheets,
      ruleCount,
      mediaQueries: Array.from(mediaQueries).slice(0, 120),
      customProperties,
    },
    dynamic: { animatedElements, iframeCount, canvasCount, videoCount, lazyImages, fixedCount },
    health: { consoleErrors: [], pageErrors: [], failedRequests: [], requests: [] },
    timing: {
      domContentLoaded: navigation ? Math.round(navigation.domContentLoadedEventEnd || 0) : 0,
      load: navigation ? Math.round(navigation.loadEventEnd || 0) : 0,
      responseEnd: navigation ? Math.round(navigation.responseEnd || 0) : 0,
      resourceCount,
      transferBytes,
    },
  }
})()`

/** A tiny script that freezes animations and lazy media before a screenshot. */
export const FREEZE_SCRIPT = String.raw`(() => {
  try {
    const style = document.createElement('style')
    style.setAttribute('data-site-rebuild', 'freeze')
    style.textContent = '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important;caret-color:transparent!important;scroll-behavior:auto!important}'
    ;(document.head || document.documentElement).appendChild(style)
    for (const video of document.querySelectorAll('video')) {
      try { video.pause(); if (Number.isFinite(video.duration)) video.currentTime = 0 } catch {}
    }
    for (const animation of document.getAnimations ? document.getAnimations({ subtree: true }) : []) {
      try { animation.finish() } catch { try { animation.pause() } catch {} }
    }
  } catch {}
})()`

/** Scroll through the page so lazy images, fonts and observers run, then return to the top. */
export const WARM_SCRIPT = String.raw`(async () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const height = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)
  const step = Math.max(320, Math.round(window.innerHeight * 0.85))
  for (let y = 0; y < height && y < 20000; y += step) {
    window.scrollTo(0, y)
    await sleep(60)
  }
  window.scrollTo(0, 0)
  await sleep(120)
  try { await document.fonts.ready } catch {}
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  return { height, width: Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0) }
})()`
