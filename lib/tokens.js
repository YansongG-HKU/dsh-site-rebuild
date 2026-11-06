/**
 * dsh-site-rebuild — design-token and layout synthesis.
 *
 * Turns one raw in-page extraction into the compact document the brief, the
 * panel and the check read: normalised colours, font stacks, type scale,
 * spacing/radius/shadow frequencies, CSS breakpoints, per-width type sizes, and
 * the section blocks with padding / items-per-row / content-column measurements
 * that make "what looks different" actionable.
 *
 * Everything here is pure: same input → same output, no files, no clock.
 */

import { isPlainObject } from './util.js'

/** Parse a CSS colour (rgb/rgba/hex) into {hex, alpha} or null. */
export function normalizeColor(value) {
  if (typeof value !== 'string') return null
  const text = value.trim().toLowerCase()
  if (!text || text === 'transparent' || text === 'rgba(0, 0, 0, 0)') return null
  if (text.startsWith('#')) {
    const hex = text.slice(1)
    if (/^[0-9a-f]{6}$/u.test(hex)) return { hex: `#${hex}`, alpha: 1 }
    if (/^[0-9a-f]{8}$/u.test(hex)) return { hex: `#${hex.slice(0, 6)}`, alpha: parseInt(hex.slice(6), 16) / 255 }
    if (/^[0-9a-f]{3}$/u.test(hex)) return { hex: `#${hex.split('').map((c) => c + c).join('')}`, alpha: 1 }
    return null
  }
  const match = /^rgba?\(([^)]+)\)$/u.exec(text)
  if (!match) return null
  const parts = match[1].split(/[,/\s]+/u).filter(Boolean).map(Number)
  if (parts.length < 3 || parts.slice(0, 3).some((n) => !Number.isFinite(n))) return null
  const channel = (n) => Math.max(0, Math.min(255, Math.round(n)))
  const alpha = parts.length > 3 && Number.isFinite(parts[3]) ? Math.max(0, Math.min(1, parts[3])) : 1
  if (alpha === 0) return null
  const hex = '#' + parts.slice(0, 3).map((n) => channel(n).toString(16).padStart(2, '0')).join('')
  return { hex, alpha }
}

/** First family of a CSS font stack, cleaned of CSS-in-JS hashes. */
export function primaryFamily(stack) {
  const first = String(stack ?? '').split(',')[0].trim().replace(/^["']|["']$/gu, '')
  return first.replace(/^_+/u, '').split('_')[0] || first
}

/** Count a key in a Map, returning a sorted [{value,count}] list. */
function tally(map, limit) {
  return [...map.entries()]
    .filter(([value]) => value !== '' && value !== undefined && value !== null)
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit)
    .map(([value, count]) => ({ value: String(value), count }))
}

/** Increment a counter map. */
function bump(map, key, amount = 1) {
  if (key === '' || key === undefined || key === null) return
  map.set(key, (map.get(key) ?? 0) + amount)
}

/** Round a number to n decimals. */
function round(value, decimals = 1) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/** Median of a numeric array (0 for an empty list). */
function median(values) {
  const list = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b)
  if (list.length === 0) return 0
  const middle = Math.floor(list.length / 2)
  return list.length % 2 === 0 ? (list[middle - 1] + list[middle]) / 2 : list[middle]
}

/** Design tokens from a raw extraction's nodes and page facts. */
export function computeDesign(raw) {
  const nodes = Array.isArray(raw?.nodes) ? raw.nodes : []
  const backgrounds = new Map()
  const textColors = new Map()
  const borderColors = new Map()
  const fonts = new Map()
  const fontSizes = new Map()
  const fontWeights = new Map()
  const lineHeights = new Map()
  const spacing = new Map()
  const radii = new Map()
  const shadows = new Map()
  const gaps = new Map()
  for (const node of nodes) {
    const style = node?.styles
    if (!isPlainObject(style)) continue
    const bg = normalizeColor(style.bg)
    if (bg) bump(backgrounds, bg.hex)
    const fg = normalizeColor(style.color)
    if (fg) bump(textColors, fg.hex)
    const bd = normalizeColor(style.bd)
    if (bd) bump(borderColors, bd.hex)
    const family = primaryFamily(style.ff)
    if (family) bump(fonts, family)
    if (style.fs > 0) bump(fontSizes, String(round(style.fs)))
    if (style.fw) bump(fontWeights, String(style.fw))
    if (style.lh > 0) bump(lineHeights, String(round(style.lh)))
    for (const value of [style.mt, style.mr, style.mb, style.ml, style.pt, style.pr, style.pb, style.pl]) {
      if (typeof value === 'number' && value > 0 && value <= 200) bump(spacing, String(round(value)))
    }
    if (style.rad > 0) bump(radii, String(round(style.rad)))
    if (style.sh) bump(shadows, String(style.sh).slice(0, 80))
    if (style.gap > 0 && style.gap <= 200) bump(gaps, String(round(style.gap)))
  }
  const bodyBg = normalizeColor(raw?.page?.bodyBg)
  const bodyColor = normalizeColor(raw?.page?.bodyColor)
  if (bodyBg) bump(backgrounds, bodyBg.hex)
  if (bodyColor) bump(textColors, bodyColor.hex)
  return {
    backgrounds: tally(backgrounds, 16),
    textColors: tally(textColors, 16),
    borderColors: tally(borderColors, 10),
    fonts: tally(fonts, 12),
    fontSizes: tally(fontSizes, 16),
    fontWeights: tally(fontWeights, 8),
    lineHeights: tally(lineHeights, 10),
    spacing: tally(spacing, 20),
    radii: tally(radii, 10),
    shadows: tally(shadows, 8),
    gaps: tally(gaps, 10),
    body: {
      background: bodyBg?.hex ?? null,
      color: bodyColor?.hex ?? null,
      font: raw?.page?.bodyFont ?? '',
    },
    customProperties: isPlainObject(raw?.css?.customProperties) ? raw.css.customProperties : {},
  }
}

/** Parse media-query widths into sorted, de-duplicated breakpoints. */
export function parseBreakpoints(mediaQueries) {
  const byWidth = new Map()
  for (const query of Array.isArray(mediaQueries) ? mediaQueries : []) {
    const text = String(query)
    const pattern = /(min|max)-width\s*:\s*([\d.]+)px/gu
    let match
    while ((match = pattern.exec(text)) !== null) {
      const kind = match[1]
      const width = Math.round(Number(match[2]))
      if (!Number.isFinite(width) || width <= 0 || width > 4000) continue
      const entry = byWidth.get(width) ?? { width, min: false, max: false, queries: [] }
      entry[kind] = true
      if (!entry.queries.includes(text)) entry.queries.push(text.slice(0, 120))
      byWidth.set(width, entry)
    }
  }
  return [...byWidth.values()].sort((a, b) => a.width - b.width).slice(0, 24).map((entry) => ({ width: entry.width, min: entry.min, max: entry.max, queries: entry.queries.slice(0, 3) }))
}

/** Elements that count as page sections for the block measurements. */
const BLOCK_TAGS = new Set(['header', 'nav', 'main', 'footer', 'section', 'article', 'aside', 'form'])

/** Direct children of a node in the raw node list (same path prefix, next depth). */
function childrenOf(nodes, node) {
  const prefix = `${node.path}/`
  return nodes.filter((child) => child.depth === node.depth + 1 && child.path.startsWith(prefix))
}

/** Items per row from child rectangles (max number sharing a row). */
function perRowOf(children) {
  if (!Array.isArray(children) || children.length === 0) return 0
  const rows = []
  for (const child of children) {
    const center = child.styles.y + child.styles.h / 2
    const tolerance = Math.max(8, child.styles.h / 4)
    let row = rows.find((candidate) => Math.abs(candidate.center - center) <= tolerance)
    if (!row) {
      row = { center, count: 0 }
      rows.push(row)
    }
    row.count += 1
  }
  return rows.reduce((max, row) => Math.max(max, row.count), 0)
}

/** The first heading inside a block, for pairing blocks between original and build. */
function headingInside(nodes, block) {
  const prefix = `${block.path}/`
  const heading = nodes.find((node) => node.path.startsWith(prefix) && /^h[1-4]$/u.test(node.tag) && node.text)
  return heading ? heading.text.slice(0, 80) : ''
}

/** Section blocks with padding, gap, per-row and content-column measurements. */
export function computeBlocks(raw) {
  const nodes = Array.isArray(raw?.nodes) ? raw.nodes : []
  const blocks = []
  for (const node of nodes) {
    if (!BLOCK_TAGS.has(node.tag) && !(node.tag === 'div' && node.depth <= 2)) continue
    if (blocks.length >= 40) break
    if (node.styles.w < 120 || node.styles.h < 24) continue
    const children = childrenOf(nodes, node)
    const widths = children.map((child) => child.styles.w).filter((width) => width > 0)
    const column = widths.length > 0 ? Math.max(...widths) : node.styles.w
    blocks.push({
      tag: node.tag,
      heading: headingInside(nodes, node),
      x: node.styles.x,
      y: node.styles.y,
      w: node.styles.w,
      h: node.styles.h,
      pad: [round(node.styles.pt), round(node.styles.pr), round(node.styles.pb), round(node.styles.pl)],
      gap: round(node.styles.gap),
      perRow: perRowOf(children),
      column: Math.round(column),
      font: node.styles.ff ? primaryFamily(node.styles.ff) : '',
    })
  }
  return blocks
}

/** Per-width type sizes for h1, h2 and body text. */
export function computeTypeScale(raw) {
  const nodes = Array.isArray(raw?.nodes) ? raw.nodes : []
  const headings = Array.isArray(raw?.headings) ? raw.headings : []
  const h1 = headings.filter((heading) => heading.tag === 'h1').map((heading) => heading.size)
  const h2 = headings.filter((heading) => heading.tag === 'h2').map((heading) => heading.size)
  const bodySizes = []
  for (const node of nodes) {
    if (['p', 'li', 'td', 'span', 'a', 'button', 'label'].includes(node.tag) && node.styles.fs > 0) bodySizes.push(node.styles.fs)
  }
  return { h1: Math.round(median(h1)), h2: Math.round(median(h2)), body: Math.round(median(bodySizes)) }
}

/** The layout measurement of one captured page at one width. */
export function computeLayout(raw, width) {
  const blocks = computeBlocks(raw)
  const type = computeTypeScale(raw)
  const columnWidths = blocks.filter((block) => ['main', 'section', 'article'].includes(block.tag)).map((block) => block.column)
  return {
    width,
    pageW: Math.max(0, Math.round(raw?.page?.w ?? 0)),
    pageH: Math.max(0, Math.round(raw?.page?.h ?? 0)),
    viewport: Math.max(0, Math.round(raw?.page?.vw ?? width)),
    type,
    contentWidth: columnWidths.length > 0 ? Math.max(...columnWidths) : 0,
    blocks,
  }
}

/** Compact asset/health metadata kept with a capture. */
export function compactExtras(raw) {
  return {
    assets: {
      images: (raw?.assets?.images ?? []).slice(0, 200),
      stylesheets: (raw?.assets?.stylesheets ?? []).slice(0, 60),
      scripts: (raw?.assets?.scripts ?? []).slice(0, 60),
      media: (raw?.assets?.media ?? []).slice(0, 40),
      fonts: (raw?.assets?.fonts ?? []).slice(0, 60),
    },
    forms: (raw?.forms ?? []).slice(0, 120),
    a11y: raw?.a11y ?? {},
    css: {
      stylesheetCount: raw?.css?.stylesheetCount ?? 0,
      inaccessibleStylesheets: raw?.css?.inaccessibleStylesheets ?? 0,
      ruleCount: raw?.css?.ruleCount ?? 0,
      breakpoints: parseBreakpoints(raw?.css?.mediaQueries),
    },
    dynamic: raw?.dynamic ?? {},
    timing: raw?.timing ?? {},
    meta: raw?.meta ?? {},
    health: raw?.health ?? { consoleErrors: [], pageErrors: [], failedRequests: [], requests: [] },
    page: {
      elements: raw?.page?.elements ?? 0,
      dpr: raw?.page?.dpr ?? 1,
    },
  }
}

/** Merge per-width pages into the capture summary the project record keeps. */
export function summarizeCapture(pages, { durationMs = 0, widths = null } = {}) {
  const pageList = Array.isArray(pages) ? pages : []
  const allWidths = Array.isArray(widths) && widths.length > 0
    ? widths
    : [...new Set(pageList.flatMap((page) => Object.keys(page.documents ?? {}).map(Number)))].filter((n) => Number.isFinite(n)).sort((a, b) => b - a)
  const startPage = pageList.find((page) => page.dir === '') ?? pageList[0] ?? null
  const startDocument = startPage?.documents?.[String(allWidths[0])] ?? Object.values(startPage?.documents ?? {})[0] ?? null
  const breakpoints = new Set()
  const fonts = new Set()
  const backgrounds = new Set()
  const pageSummaries = []
  for (const page of pageList) {
    const widthData = []
    let title = ''
    for (const width of allWidths) {
      const document = page.documents?.[String(width)]
      if (!document) continue
      if (!title) title = document.title ?? ''
      for (const breakpoint of document.css?.breakpoints ?? []) breakpoints.add(breakpoint.width)
      for (const font of document.design?.fonts ?? []) fonts.add(font.value)
      for (const colour of document.design?.backgrounds ?? []) backgrounds.add(colour.value)
      widthData.push({
        width,
        pageW: document.layouts?.pageW ?? document.pageW ?? 0,
        pageH: document.layouts?.pageH ?? document.pageH ?? 0,
        type: document.layouts?.type ?? {},
        blocks: document.layouts?.blocks?.length ?? 0,
        elements: document.page?.elements ?? 0,
        durationMs: document.durationMs ?? 0,
      })
    }
    pageSummaries.push({
      path: page.path ?? '',
      slug: page.slug ?? '',
      dir: page.dir ?? '',
      url: page.url ?? '',
      title,
      elements: widthData[0]?.elements ?? 0,
      blocks: widthData[0]?.blocks ?? 0,
      widthData,
    })
  }
  const startWidthData = pageSummaries.find((page) => page.dir === '')?.widthData?.[0] ?? pageSummaries[0]?.widthData?.[0] ?? null
  return {
    widths: allWidths,
    pages: pageSummaries,
    start: startDocument
      ? {
          title: startDocument.title,
          lang: startDocument.lang,
          pageW: startWidthData?.pageW ?? 0,
          pageH: startWidthData?.pageH ?? 0,
          type: startWidthData?.type ?? {},
        }
      : null,
    breakpoints: [...breakpoints].sort((a, b) => a - b),
    fonts: [...fonts].slice(0, 20),
    backgrounds: [...backgrounds].slice(0, 20),
    tokenCounts: {
      backgrounds: startDocument?.design?.backgrounds?.length ?? 0,
      textColors: startDocument?.design?.textColors?.length ?? 0,
      fonts: startDocument?.design?.fonts?.length ?? 0,
      fontSizes: startDocument?.design?.fontSizes?.length ?? 0,
      spacing: startDocument?.design?.spacing?.length ?? 0,
    },
    durationMs,
  }
}

/** Human/agent-readable capture README (the study's own description of the target). */
export function captureReadme(project, pages) {
  const lines = []
  lines.push(`# 捕获说明 · ${project.name}`)
  lines.push('')
  lines.push(`- 目标：${project.target?.url ?? ''}`)
  lines.push(`- 请求：${project.request || '（未填写）'}`)
  lines.push(`- 模式：${project.mode === 'deep' ? '深潜（可读源码）' : '净室（只读访客可见内容）'}`)
  lines.push(`- 捕获时间：${project.capture?.studiedAt ?? ''}`)
  lines.push(`- 宽度：${(project.capture?.widths ?? []).join(' / ')} px`)
  lines.push('')
  lines.push('## 页面')
  for (const page of project.capture?.pages ?? []) {
    const first = page.widthData?.[0]
    lines.push(`- ${page.path || '/'}（${page.title || '无标题'}）— ${first?.pageW ?? 0}×${first?.pageH ?? 0} px，${page.elements ?? 0} 个元素${page.dir ? `，截图目录 capture/${page.dir}/` : '，截图在 capture/'}`)
  }
  lines.push('')
  const startPage = pages.find((page) => page.dir === '') ?? pages[0]
  const start = startPage?.documents?.[String(project.capture?.widths?.[0])] ?? Object.values(startPage?.documents ?? {})[0] ?? null
  if (start) {
    lines.push('## 设计令牌')
    lines.push('')
    lines.push('### 颜色')
    for (const [name, key] of [
      ['背景', 'backgrounds'],
      ['文字', 'textColors'],
      ['描边', 'borderColors'],
    ]) {
      const values = (start.design?.[key] ?? []).slice(0, 10)
      if (values.length > 0) lines.push(`- ${name}：${values.map((entry) => `${entry.value}×${entry.count}`).join('、')}`)
    }
    lines.push('')
    lines.push('### 字体与字号')
    const fonts = (start.design?.fonts ?? []).slice(0, 8).map((entry) => entry.value)
    const sizes = (start.design?.fontSizes ?? []).slice(0, 12).map((entry) => entry.value)
    const weights = (start.design?.fontWeights ?? []).slice(0, 6).map((entry) => entry.value)
    lines.push(`- 字体：${fonts.join('、') || '（无）'}`)
    lines.push(`- 字号：${sizes.join('、') || '（无）'}`)
    lines.push(`- 字重：${weights.join('、') || '（无）'}`)
    lines.push('')
    lines.push('### 间距、圆角与阴影')
    const spacing = (start.design?.spacing ?? []).slice(0, 16).map((entry) => entry.value)
    const radii = (start.design?.radii ?? []).slice(0, 8).map((entry) => entry.value)
    const shadows = (start.design?.shadows ?? []).slice(0, 4).map((entry) => entry.value)
    lines.push(`- 间距：${spacing.join('、') || '（无）'}`)
    lines.push(`- 圆角：${radii.join('、') || '（无）'}`)
    lines.push(`- 阴影：${shadows.join('；') || '（无）'}`)
    lines.push('')
    lines.push('### 断点（CSS 媒体查询）')
    lines.push((start.css?.breakpoints ?? []).map((breakpoint) => `${breakpoint.width}px${breakpoint.min ? '（min）' : ''}${breakpoint.max ? '（max）' : ''}`).join('、') || '（未发现）')
    lines.push('')
    lines.push('### 各宽度布局')
    const startWidths = project.capture?.pages?.find((page) => page.dir === '')?.widthData ?? []
    for (const widthData of startWidths) {
      lines.push(`- ${widthData.width} px：页面 ${widthData.pageW} 宽；标题 ${widthData.type?.h1 ?? 0}px / 副标题 ${widthData.type?.h2 ?? 0}px / 正文 ${widthData.type?.body ?? 0}px；区块 ${widthData.blocks ?? 0} 个`)
    }
    lines.push('')
    lines.push('### 页面骨架（大纲）')
    for (const item of (start.outline ?? []).slice(0, 40)) {
      lines.push(`- ${'  '.repeat(Math.min(item.depth, 4))}${item.tag}${item.role ? `[${item.role}]` : ''}${item.text ? `：${item.text}` : ''}`)
    }
    lines.push('')
    lines.push('### 健康')
    const health = start.health ?? {}
    lines.push(`- 控制台错误：${(health.consoleErrors ?? []).length}；页面错误：${(health.pageErrors ?? []).length}；失败请求：${(health.failedRequests ?? []).length}`)
    lines.push(`- 请求数：${(health.requests ?? []).length}；资源 ${start.timing?.resourceCount ?? 0} 个，传输 ${start.timing?.transferBytes ?? 0} 字节`)
    lines.push(`- 无障碍：landmarks ${Object.keys(start.a11y?.landmarks ?? {}).join('、') || '无'}；无 alt 图片 ${start.a11y?.imagesWithoutAlt ?? 0}；无名称控件 ${start.a11y?.unnamedControls ?? 0}`)
    lines.push('')
    lines.push('## 局限')
    lines.push('- 净室模式不读取页面源码或脚本；深潜模式才允许读。')
    lines.push('- 动态区域（轮播、视频、动画）用噪声掩膜标记，不参与像素对比。')
    lines.push('- 跨域 iframe、Shadow DOM 内部、canvas 内容不提取。')
  }
  return lines.join('\n') + '\n'
}
