import { mkdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

/**
 * Regenerates the derived raster assets of the Snug brand kit from the SVG
 * sources in `docs/brand/logo`: extension icons, Chrome Web Store tiles, OG
 * images and the README cover. Run with `bun run brand:export`.
 *
 * Fonts are embedded from `docs/brand/brandbook/fonts` so output does not
 * depend on fonts installed on the host. CWS screenshots are not generated
 * here; they need the real running extension.
 */
const brandRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const repoRoot = path.resolve(brandRoot, '../..')
const fontsRoot = path.join(brandRoot, 'brandbook/fonts')

const GROUND = '#17120A'
const OG_MAX_BYTES = 300 * 1024

const markSvg = await readFile(path.join(brandRoot, 'logo/mark.svg'), 'utf8')
const lockupSvg = await readFile(
  path.join(brandRoot, 'logo/lockup-horizontal.svg'),
  'utf8',
)

const auroraGlow = `radial-gradient(60% 70% at 20% 30%, rgba(255,162,48,0.22), transparent 68%), radial-gradient(44% 54% at 100% 100%, rgba(255,162,48,0.14), transparent 70%), ${GROUND}`

const fontRules = await Promise.all(
  [
    ['Geist', 'Geist-var.woff2', '400 700'],
    ['Space Grotesk', 'SpaceGrotesk-var.woff2', '300 700'],
  ].map(async ([family, fileName, weight]) => {
    const buffer = await readFile(path.join(fontsRoot, fileName))
    const data = buffer.toString('base64')
    return `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${data}) format('woff2')}`
  }),
)
const fontFaces = fontRules.join('')

async function renderIcon(browser, size, fileName) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
  })
  const markSize = Math.round(size * 0.86)
  await page.setContent(
    `<body style="margin:0;display:grid;place-items:center;width:${size}px;height:${size}px">` +
      `<div style="width:${markSize}px;height:${markSize}px">${markSvg}</div></body>`,
  )
  const outPath = path.join(brandRoot, 'logo/png', fileName)
  await mkdir(path.dirname(outPath), { recursive: true })
  await page.screenshot({ path: outPath, omitBackground: true })
  await page.close()
  console.log(path.relative(repoRoot, outPath))
}

async function renderBanner(
  browser,
  { width, height, outPath, lockupWidth, tagline },
) {
  const page = await browser.newPage({ viewport: { width, height } })
  const taglineHtml = tagline
    ? `<div style="font-family: Geist, system-ui, sans-serif; font-size: ${Math.round(height * 0.032)}px; color: #DCC8A6; max-width: ${Math.round(width * 0.72)}px; text-align: center; line-height: 1.5; margin-top: ${Math.round(height * 0.04)}px">${tagline}</div>`
    : ''
  await page.setContent(`
    <style>${fontFaces}</style>
    <body style="margin:0;width:${width}px;height:${height}px;background:${auroraGlow};display:flex;align-items:center;justify-content:center;flex-direction:column;box-sizing:border-box">
      <div style="width:${lockupWidth}px">${lockupSvg}</div>
      ${taglineHtml}
    </body>`)
  await page.waitForFunction('document.fonts.status === "loaded"')
  await mkdir(path.dirname(outPath), { recursive: true })
  await page.screenshot({ path: outPath })
  await page.close()
  const { size } = await stat(outPath)
  console.log(
    `${path.relative(repoRoot, outPath)} ${(size / 1024).toFixed(0)} KB`,
  )
  return size
}

function assertOgSize(fileName, size) {
  if (size > OG_MAX_BYTES) {
    throw new Error(`${fileName} exceeds ${OG_MAX_BYTES} bytes`)
  }
}

const browser = await chromium.launch()

try {
  for (const size of [16, 32, 48, 128]) {
    await renderIcon(browser, size, `mark-${size}.png`)
  }

  const storeAssets = path.join(repoRoot, 'docs/store/assets')
  await renderBanner(browser, {
    width: 440,
    height: 280,
    outPath: path.join(storeAssets, 'small-tile-440x280.png'),
    lockupWidth: 190,
  })
  await renderBanner(browser, {
    width: 1400,
    height: 560,
    outPath: path.join(storeAssets, 'marquee-1400x560.png'),
    lockupWidth: 420,
  })

  const ogTaglines = {
    en: 'Export, import, and schedule automatic backups for your bookmarks &mdash; HTML, JSON, or CSV, all on your device, no account, no cloud.',
    es: 'Programa respaldos autom&aacute;ticos de tus bookmarks, exporta e importa en HTML, JSON o CSV &mdash; todo en tu dispositivo, sin cuenta ni nube.',
  }
  for (const [language, tagline] of Object.entries(ogTaglines)) {
    const fileName = `og-${language}.png`
    const size = await renderBanner(browser, {
      width: 1200,
      height: 630,
      outPath: path.join(brandRoot, 'og', fileName),
      lockupWidth: 360,
      tagline,
    })
    assertOgSize(fileName, size)
  }

  await renderBanner(browser, {
    width: 1280,
    height: 640,
    outPath: path.join(repoRoot, 'docs/assets/readme-cover.png'),
    lockupWidth: 380,
    tagline:
      'Export, import, and back up your bookmarks &mdash; entirely on your device.',
  })
} finally {
  await browser.close()
}
