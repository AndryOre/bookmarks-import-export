import { copyFile, mkdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

/**
 * Regenerates the derived raster assets of the Snug brand kit from the SVG
 * sources in `docs/brand/logo`: the extension icon (`assets/icon.png`), PNG
 * marks, the Chrome Web Store icon and tiles, OG images and the README banner (a copy of the store marquee). Run with `bun run brand:export`.
 *
 * Icons are drawn at 75% of a transparent canvas: the SVG's fixed size is forced
 * to fill its container, sized so the painted bookmark spans 96 of 128 px.
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
const ICON_ART_RATIO = 0.75
const MARK_ART_HEIGHT_RATIO = 70 / 84
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

async function renderIcon(browser, size, outPath) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
  })
  const markSize = Math.round((size * ICON_ART_RATIO) / MARK_ART_HEIGHT_RATIO)
  await page.setContent(
    `<style>svg{display:block;width:100%;height:100%}</style>` +
      `<body style="margin:0;display:grid;place-items:center;width:${size}px;height:${size}px">` +
      `<div style="width:${markSize}px;height:${markSize}px">${markSvg}</div></body>`,
  )
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
    <style>${fontFaces}svg{display:block;width:100%;height:auto}</style>
    <body style="margin:0;width:${width}px;height:${height}px;background:${auroraGlow};display:flex;align-items:center;justify-content:center;flex-direction:column;box-sizing:border-box">
      <div style="width:${lockupWidth}px">${lockupSvg}</div>
      ${taglineHtml}
    </body>`)
  return finishPage(page, outPath)
}

async function finishPage(page, outPath) {
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

async function renderSmallTile(browser, outPath) {
  const page = await browser.newPage({ viewport: { width: 440, height: 280 } })
  await page.setContent(`
    <style>${fontFaces}svg{display:block;width:100%;height:auto}</style>
    <body style="margin:0;width:440px;height:280px;position:relative;overflow:hidden;background:radial-gradient(70% 80% at 50% 38%, rgba(255,162,48,0.38), transparent 72%), radial-gradient(50% 60% at 100% 100%, rgba(255,162,48,0.2), transparent 70%), ${GROUND}">
      <div style="position:absolute;inset:0;box-shadow:inset 0 0 0 1px rgba(255,162,48,0.25);pointer-events:none"></div>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-bottom:16px">
        <div style="width:260px">${lockupSvg}</div>
        <div style="font-family:Geist,system-ui,sans-serif;font-size:22px;color:#DCC8A6;text-align:center;line-height:1.3;margin-top:22px;max-width:400px">Export, import &amp; back up bookmarks</div>
      </div>
    </body>`)
  return finishPage(page, outPath)
}

const folderIcon = `<svg viewBox="0 0 24 24" width="40" height="40" style="flex:none"><path d="M2 6.5A2.5 2.5 0 0 1 4.5 4H9l2.5 3H19.5A2.5 2.5 0 0 1 22 9.5v8A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5Z" fill="#DCC8A6"/></svg>`

function treeRow(indent, barWidth, checked) {
  const box = checked
    ? `<div style="width:34px;height:34px;border-radius:8px;background:#FFA230;flex:none"></div>`
    : `<div style="width:34px;height:34px;border-radius:8px;border:3px solid #FFA230;box-sizing:border-box;flex:none"></div>`
  return `<div style="display:flex;align-items:center;gap:20px;margin-left:${indent}px">${box}${folderIcon}<div style="height:16px;border-radius:8px;background:rgba(220,200,166,0.55);width:${barWidth}px"></div></div>`
}

async function renderMarquee(browser, outPath) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 560 } })
  const chips = ['HTML', 'JSON', 'CSV']
    .map(
      (label) =>
        `<div style="font-family:'Space Grotesk',Geist,sans-serif;font-weight:700;font-size:34px;letter-spacing:0.04em;color:#17120A;background:linear-gradient(135deg,#FFA230,#FFD37A);border-radius:999px;padding:14px 34px;text-align:center">${label}</div>`,
    )
    .join('')
  await page.setContent(`
    <style>${fontFaces}svg{display:block}</style>
    <body style="margin:0;width:1400px;height:560px;position:relative;overflow:hidden;background:radial-gradient(45% 80% at 72% 50%, rgba(255,162,48,0.26), transparent 70%), ${auroraGlow}">
      <div style="position:absolute;left:80px;top:0;width:520px;height:560px;display:flex;flex-direction:column;justify-content:center">
        <div style="width:380px"><div style="width:380px">${lockupSvg.replace(/width="267" height="84"/, 'width="380" height="120"')}</div></div>
        <div style="font-family:Geist,system-ui,sans-serif;font-size:30px;color:#DCC8A6;line-height:1.4;margin-top:36px">Export, import, and back up your bookmarks &mdash; all on your device.</div>
      </div>
      <div style="position:absolute;left:680px;top:0;width:660px;height:560px;display:flex;align-items:center;gap:36px">
        <div style="width:420px;box-sizing:border-box;padding:40px 36px;border-radius:16px;background:#231A10;border:1px solid rgba(255,162,48,0.25);box-shadow:0 24px 60px rgba(0,0,0,0.45);display:flex;flex-direction:column;gap:30px">
          ${treeRow(0, 200, true)}
          ${treeRow(44, 160, true)}
          ${treeRow(44, 120, false)}
          ${treeRow(0, 180, true)}
        </div>
        <div style="display:flex;flex-direction:column;gap:22px;width:170px">${chips}</div>
      </div>
    </body>`)
  return finishPage(page, outPath)
}

function assertOgSize(fileName, size) {
  if (size > OG_MAX_BYTES) {
    throw new Error(`${fileName} exceeds ${OG_MAX_BYTES} bytes`)
  }
}

const browser = await chromium.launch()

try {
  for (const size of [16, 32, 48, 128]) {
    await renderIcon(
      browser,
      size,
      path.join(brandRoot, 'logo/png', `mark-${size}.png`),
    )
  }
  await renderIcon(browser, 512, path.join(repoRoot, 'assets/icon.png'))

  const storeAssets = path.join(repoRoot, 'docs/store/assets')
  await renderIcon(browser, 128, path.join(storeAssets, 'store-icon-128.png'))
  await renderSmallTile(
    browser,
    path.join(storeAssets, 'small-tile-440x280.png'),
  )
  const marqueePath = path.join(storeAssets, 'marquee-1400x560.png')
  await renderMarquee(browser, marqueePath)
  const readmeBannerPath = path.join(repoRoot, 'docs/assets/readme-banner.png')
  await mkdir(path.dirname(readmeBannerPath), { recursive: true })
  await copyFile(marqueePath, readmeBannerPath)

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
} finally {
  await browser.close()
}
