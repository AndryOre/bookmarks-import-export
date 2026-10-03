import type { Page } from '@playwright/test'
import { ChartNoAxesCombined, CloudOff, Code, UserX } from 'lucide-react'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const CANVAS = { width: 1280, height: 800 }
const FONTS_DIRECTORY = path.resolve('docs/brand/brandbook/fonts')
const STORE_ICON_PATH = path.resolve('assets/icon.png')
const AMBER = '#FFA230'

const AURORA_GROUND =
  'radial-gradient(60% 70% at 20% 30%, rgba(255,162,48,0.22), transparent 68%), radial-gradient(44% 54% at 100% 100%, rgba(255,162,48,0.14), transparent 70%), #17120A'

const FONT_FILES = [
  ['Geist', 'Geist-var.woff2', '400 700'],
  ['Space Grotesk', 'SpaceGrotesk-var.woff2', '300 700'],
] as const

/**
 * The copy shown above the UI on every slide.
 */
export type SlideCaption = { headline: string; subtitle?: string }

/**
 * A UI slide: a raw 2x capture displayed as a card under the caption.
 */
export type UiSlide = SlideCaption & {
  screenshot: Buffer
  cardWidth: number
  cardTop: number
  cardHeight?: number
}

/**
 * A claim row on the local-only slide: a lucide icon and one line of text.
 */
export type LocalClaim = {
  icon: 'account' | 'upload' | 'tracking' | 'source'
  text: string
}

const CLAIM_ICONS = {
  account: UserX,
  upload: CloudOff,
  tracking: ChartNoAxesCombined,
  source: Code,
} as const

async function buildFontFaces(): Promise<string> {
  const rules = await Promise.all(
    FONT_FILES.map(async ([family, fileName, weight]) => {
      const buffer = await readFile(path.join(FONTS_DIRECTORY, fileName))
      const data = buffer.toString('base64')
      return `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${data}) format('woff2')}`
    }),
  )
  return rules.join('')
}

function toDataUri(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString('base64')}`
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function captionHtml({ headline, subtitle }: SlideCaption): string {
  const subtitleHtml = subtitle
    ? `<p class="subtitle">${escapeHtml(subtitle)}</p>`
    : ''
  return `<h1 class="headline">${escapeHtml(headline)}</h1>${subtitleHtml}`
}

async function renderDocument(
  page: Page,
  body: string,
  outputPath: string,
): Promise<void> {
  const fontFaces = await buildFontFaces()
  await page.setViewportSize(CANVAS)
  await page.setContent(`<!doctype html><html><head><style>
    ${fontFaces}
    *{box-sizing:border-box}
    html,body{margin:0;width:${CANVAS.width}px;height:${CANVAS.height}px;overflow:hidden}
    body{position:relative;background:${AURORA_GROUND};font-family:Geist,system-ui,sans-serif}
    .headline{position:absolute;top:64px;left:0;right:0;margin:0;text-align:center;font:600 60px/66px 'Space Grotesk',sans-serif;color:#F3EBDE;white-space:nowrap}
    .subtitle{position:absolute;top:146px;left:0;right:0;margin:0;text-align:center;font:400 26px/34px Geist,sans-serif;color:#DCC8A6}
    .card{position:absolute;left:50%;transform:translateX(-50%);overflow:hidden;border-radius:16px;border:1px solid rgba(243,235,222,0.12);box-shadow:0 24px 64px rgb(0 0 0 / .45)}
    .card img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}
  </style></head><body>${body}</body></html>`)
  await page.evaluate('document.fonts.ready')
  await assertNoOverflow(page, outputPath)
  await page.screenshot({ path: outputPath, animations: 'disabled' })
}

const MAX_TEXT_WIDTH = CANVAS.width - 80
const MAX_SUBTITLE_HEIGHT = 68

async function assertNoOverflow(page: Page, outputPath: string): Promise<void> {
  const problems = (await page.evaluate(`(() => {
    const found = []
    const textWidth = (element) => {
      const range = document.createRange()
      range.selectNodeContents(element)
      return range.getBoundingClientRect().width
    }
    for (const element of document.querySelectorAll('.headline, li')) {
      if (textWidth(element) > ${MAX_TEXT_WIDTH})
        found.push(element.textContent + ' is wider than ${MAX_TEXT_WIDTH}px')
    }
    for (const element of document.querySelectorAll('.subtitle')) {
      if (element.getBoundingClientRect().height > ${MAX_SUBTITLE_HEIGHT})
        found.push(element.textContent + ' wraps past two lines')
    }
    return found
  })()`)) as string[]
  if (problems.length > 0)
    throw new Error(`Clipped text in ${outputPath}: ${problems.join('; ')}`)
}

/**
 * Composes a 1280x800 store slide: caption on the aurora ground over a card
 * holding a raw UI capture. A card without `cardHeight` bleeds off the bottom
 * edge.
 * @param page A scratch page used only for rendering.
 * @param slide The caption, the raw capture and the card geometry.
 * @param outputPath Where the final PNG is written.
 */
export async function composeUiSlide(
  page: Page,
  slide: UiSlide,
  outputPath: string,
): Promise<void> {
  const height = slide.cardHeight ?? CANVAS.height - slide.cardTop + 2
  const body = `${captionHtml(slide)}<div class="card" style="top:${slide.cardTop}px;width:${slide.cardWidth}px;height:${height}px"><img src="${toDataUri(slide.screenshot)}" alt=""></div>`
  await renderDocument(page, body, outputPath)
}

/**
 * Composes the local-only slide: the store icon over amber-icon claim rows,
 * with no app UI.
 * @param page A scratch page used only for rendering.
 * @param caption The headline of the slide.
 * @param claims The claim rows, top to bottom.
 * @param outputPath Where the final PNG is written.
 */
export async function composeLocalSlide(
  page: Page,
  caption: SlideCaption,
  claims: LocalClaim[],
  outputPath: string,
): Promise<void> {
  const icon = toDataUri(await readFile(STORE_ICON_PATH))
  const rows = claims
    .map(({ icon: name, text }) => {
      const svg = renderToStaticMarkup(
        createElement(CLAIM_ICONS[name], {
          size: 40,
          color: AMBER,
          strokeWidth: 2,
        }),
      )
      return `<li style="display:flex;align-items:center;gap:24px;height:72px;font-size:30px;line-height:1.2;white-space:nowrap;color:#F3EBDE">${svg}<span>${escapeHtml(text)}</span></li>`
    })
    .join('')
  const body = `${captionHtml(caption)}
    <img src="${icon}" alt="" style="position:absolute;top:150px;left:50%;width:200px;height:200px;transform:translateX(-50%)">
    <ul style="position:absolute;top:390px;left:50%;transform:translateX(-50%);margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:12px">${rows}</ul>`
  await renderDocument(page, body, outputPath)
}
