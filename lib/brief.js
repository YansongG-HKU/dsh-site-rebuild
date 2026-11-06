/**
 * dsh-site-rebuild — the build brief.
 *
 * This is the hand-off between "understanding" and "building": the exact design
 * values a study measured, the structure it saw, the responsive rules it found,
 * and the clean-room/originality rules the build must follow. It is deliberately
 * plain markdown so any agent (and the person) can read it, and bounded so it
 * never floods a context window.
 */

import { LIMITS } from './config.js'
import { textLikeness } from './diff.js'
import { byteLength, truncateUtf8 } from './util.js'

/** The primary document of a page (its first captured width). */
function firstDocument(page) {
  return page?.documents?.[String(page?.widths?.[0])] ?? Object.values(page?.documents ?? {})[0] ?? null
}

/** Per-width type sizes and page widths, as a compact table. */
function responsiveTable(pages, widths) {
  const rows = []
  for (const page of pages) {
    for (const width of widths) {
      const document = page.documents?.[String(width)]
      if (!document) continue
      const layout = document.layouts ?? {}
      rows.push({
        page: page.path || '/',
        width,
        pageW: layout.pageW ?? document.pageW,
        pageH: layout.pageH ?? document.pageH,
        h1: layout.type?.h1 ?? 0,
        h2: layout.type?.h2 ?? 0,
        body: layout.type?.body ?? 0,
      })
    }
  }
  return rows
}

/** Format a token list as `value×count`. */
function tokenLine(list, limit = 12) {
  return (Array.isArray(list) ? list : [])
    .slice(0, limit)
    .map((entry) => `${entry.value}×${entry.count}`)
    .join('、')
}

/**
 * Build the markdown brief.
 * @param {object} options
 * @param {object} options.project the project record
 * @param {{start: object, routes: object[], widths: number[]}} options.capture loaded capture documents
 * @param {object[]} [options.evidence]
 * @returns {{markdown: string, bytes: number, truncated: boolean}}
 */
export function buildBrief({ project, capture, evidence = [] }) {
  const start = capture?.start ?? null
  const startDoc = firstDocument(start)
  const widths = Array.isArray(capture?.widths) && capture.widths.length > 0 ? capture.widths : project?.capture?.widths ?? []
  const pages = [start, ...(capture?.routes ?? [])].filter(Boolean)
  const lines = []
  const push = (line = '') => lines.push(line)

  push(`# 建造简报 · ${project?.name ?? project?.target?.url ?? ''}`)
  push('')
  push(`- 目标：${project?.target?.url ?? ''}`)
  push(`- 用户请求：${project?.request || '（未填写，默认按原样复刻布局与样式）'}`)
  push(`- 模式：${project?.mode === 'deep' ? '深潜（允许查看原始站点的源码与脚本）' : '净室（只看访客可见内容，不读取原始站点源码）'}`)
  push(`- 工作目录：\`${'<项目目录>'}/app/\`。只在这个目录里写你的项目；保留父目录中的 capture/、checks/ 记录不动。`)
  if (project?.stack) push(`- 指定技术栈：${project.stack}`)
  push('')
  push('## 你的任务')
  push('')
  push('1. 在这个插件登记的 `app/` 目录里，从零写一个**可运行**的重建版本，不是示意图。')
  push('2. 复刻下面测量的布局、颜色、字体、间距、断点和交互；写自己的等价文案，不照抄受版权保护的原文。')
  push('3. 写完后调用 `craft_check`（projectId 见括号）或让用户在面板点「校验」，按返回的差异清单继续修。')
  push(`4. 验收目标：总分 ≥ 90；文本相似度 ≥ 80；三档宽度都不横向滚动；没有原站点没有的控制台错误/失败请求。`)
  push('')
  push('## 净室与原创性（必须遵守）')
  push('')
  push('- 净室模式：不要访问原始 URL 的源码、脚本、接口返回；只依据本简报与截图复刻可见行为。')
  push('- 不要下载或复制原始站点的 logo、照片、插画、视频、字体文件与本文案；用 CSS 渐变、SVG 占位图和自己写的等价文案代替。')
  push('- 可复刻的是：布局结构、间距比例、颜色体系、字体类别（如 serif/sans）、圆角/阴影、断点、交互模式。')
  push('- 不绕过登录、付费墙、反爬或 DRM；不请求原站点的私有接口。')
  push('')
  push('## 精确设计值（来自浏览器计算样式，置信度约 0.98）')
  push('')
  if (startDoc?.design) {
    push(`- 背景色：${tokenLine(startDoc.design.backgrounds)}`)
    push(`- 文字色：${tokenLine(startDoc.design.textColors)}`)
    const border = tokenLine(startDoc.design.borderColors, 8)
    if (border) push(`- 描边色：${border}`)
    push(`- 字体：${tokenLine(startDoc.design.fonts, 8)}`)
    push(`- 字号：${tokenLine(startDoc.design.fontSizes, 16)}`)
    push(`- 字重：${tokenLine(startDoc.design.fontWeights, 8)}`)
    push(`- 行高：${tokenLine(startDoc.design.lineHeights, 10)}`)
    push(`- 间距：${tokenLine(startDoc.design.spacing, 18)}`)
    push(`- 圆角：${tokenLine(startDoc.design.radii, 8) || '无'}`)
    push(`- 阴影：${tokenLine(startDoc.design.shadows, 4) || '无'}`)
    const cps = Object.entries(startDoc.design.customProperties ?? {}).slice(0, 20)
    if (cps.length > 0) push(`- CSS 变量（可还原为同名变量）：${cps.map(([name, value]) => `${name}: ${value}`).join('；')}`)
  }
  push('')
  push('## 断点与响应式')
  push('')
  const breakpoints = new Set()
  for (const page of pages) for (const document of Object.values(page.documents ?? {})) for (const bp of document.css?.breakpoints ?? []) breakpoints.add(bp.width)
  push(`- 原始 CSS 断点：${[...breakpoints].sort((a, b) => a - b).map((w) => `${w}px`).join('、') || '未发现（可能有容器查询或 JS 响应）'}`)
  push('- 在相同断点切换布局；每个宽度都要和对应截图一致，不允许手机宽度横向滚动。')
  push('')
  push('| 页面 | 宽度 | 页面尺寸 | h1 | h2 | 正文 |')
  push('| --- | --- | --- | --- | --- | --- |')
  for (const row of responsiveTable(pages, widths)) {
    push(`| ${row.page} | ${row.width}px | ${row.pageW}×${row.pageH} | ${row.h1}px | ${row.h2}px | ${row.body}px |`)
  }
  push('')
  if (pages.length > 1) {
    push('## 子页面')
    push('')
    for (const page of pages.slice(1)) {
      push(`- \`${page.path}\`：截图在 capture/${page.dir}/，按同样的布局与导航复刻，构建时使用相同路径（如 \`app/${page.path.replace(/^\//u, '')}/index.html\` 或前端路由）。`)
    }
    push('')
  }
  push('## 页面结构大纲（原始页面）')
  push('')
  for (const item of (startDoc?.outline ?? []).slice(0, 60)) {
    const indent = '  '.repeat(Math.min(item.depth ?? 0, 5))
    push(`- ${indent}${item.tag}${item.role ? `[${item.role}]` : ''}${item.text ? `：${item.text.slice(0, 70)}` : ''}`)
  }
  push('')
  push('## 区块测量（padding / 每行个数 / 内容列宽）')
  push('')
  push('| 页面 | 宽度 | 区块 | 标题 | padding(上右下左) | 每行 | 内容列宽 |')
  push('| --- | --- | --- | --- | --- | --- | --- |')
  for (const page of pages) {
    for (const width of widths) {
      const document = page.documents?.[String(width)]
      for (const block of (document?.layouts?.blocks ?? []).slice(0, 14)) {
        push(`| ${page.path || '/'} | ${width} | ${block.tag} | ${String(block.heading || '').slice(0, 22)} | ${(block.pad ?? []).join(' ')} | ${block.perRow} | ${block.column}px |`)
      }
    }
  }
  push('')
  push('## 可见文案（结构参考）')
  push('')
  const headings = (startDoc?.headings ?? []).slice(0, 40)
  if (headings.length > 0) {
    push('标题：')
    for (const heading of headings) push(`- ${heading.tag}: ${heading.text}`)
  }
  const bodyText = String(startDoc?.text ?? '').replace(/\s+/gu, ' ').trim().slice(0, 1200)
  if (bodyText) push(`\n正文摘要（仅供理解语气与信息结构，不要逐字照抄）：${bodyText}`)
  push('')
  const interactions = (startDoc?.outline ?? []).filter((item) => ['a', 'button', 'input', 'select', 'textarea', 'form'].includes(item.tag)).slice(0, 30)
  if (interactions.length > 0) {
    push('## 交互元素')
    push('')
    for (const item of interactions) push(`- ${item.tag}${item.text ? `：${item.text}` : ''}`)
    push('')
  }
  push('## 资源与素材')
  push('')
  const images = startDoc?.assets?.images?.length ?? 0
  const stylesheets = startDoc?.css?.stylesheetCount ?? 0
  const scripts = startDoc?.assets?.scripts?.length ?? 0
  push(`- 原始站点有 ${images} 张图片、${stylesheets} 个样式表、${scripts} 个脚本。**全部不要直接下载使用**；用 CSS/SVG 占位或自己生成的等效图形。`)
  push('- 字体只复刻类别与度量（如 serif/sans-serif + 字号/行高/字重），不使用原始站点的字体文件。')
  push('')
  push('## 自检命令')
  push('')
  push('```text')
  push(`craft_check({ projectId: "${project?.id ?? ''}" })`)
  push('```')
  push('')
  push('返回会给出每档宽度的相似度、布局/细节分、差异区块、文本/结构/设计差异与未通过项；按清单从最大的视觉差异开始修。')
  push('')
  if (project?.capture?.limitations?.length > 0) {
    push('## 已知局限（研究阶段记录）')
    push('')
    for (const limitation of project.capture.limitations.slice(0, 12)) push(`- ${limitation}`)
    push('')
  }
  const evidenceLine = evidence.length > 0 ? `\n> 证据：本次研究产生 ${evidence.length} 条证据记录（可在面板「证据」页查看置信度与局限）。\n` : ''
  let markdown = lines.join('\n') + '\n' + evidenceLine
  const bounded = truncateUtf8(markdown, LIMITS.briefBytes)
  return { markdown: bounded.text, bytes: byteLength(markdown), truncated: bounded.truncated }
}
