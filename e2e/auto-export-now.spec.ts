/// <reference types="chrome" />
import type { Page, Worker } from '@playwright/test'
import { stat } from 'node:fs/promises'
import type { Server } from 'node:http'
import { createServer } from 'node:http'

import { expect, test } from './fixtures'
import type { SeedBookmark } from './fixtures'

/**
 * A real, tiny (1x1) but valid PNG — decodable by Chrome's favicon system,
 * so navigating to a page that references it (below) makes Chrome cache an
 * actual favicon for that page, distinct from the generic globe placeholder
 * it serves for an uncached page (see {@link DEFAULT_CHROME_FAVICON}).
 */
const ICON_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

/**
 * Copied from `lib/favicon.ts`'s `DEFAULT_CHROME_FAVICON` — the exact data
 * URL Chrome's `_favicon` API returns when it has no favicon cached for a
 * page. Used here (not imported — this file isn't bundled through the
 * extension) to detect once our test page's favicon has actually been
 * cached, before seeding bookmarks that depend on it.
 */
const DEFAULT_CHROME_FAVICON =
  'data:image/bmp;base64,Qk06AAAAAAAAADYAAAAoAAAAEAAAABAAAAABABgAAAAAAA' +
  'QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAArwCv' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

/**
 * How many bookmarks {@link buildIconHeavyBookmarks} creates, all pointing
 * at the same favicon-bearing URL. `exportToHTML`
 * (`lib/exporters/export-html.ts`) calls `getFaviconBase64` once per
 * bookmark node, so the same cached favicon's base64 gets embedded once per
 * bookmark line — bookmark count alone controls the exported file's size.
 * Chosen with a comfortable margin over the 2MB data-URL/IPC limit
 * {@link downloadViaOffscreenDocument} (`lib/offscreen-download.ts`) exists
 * to get around, even if a real cached favicon turns out smaller than the
 * default placeholder's ~300 bytes.
 */
const ICON_HEAVY_BOOKMARK_COUNT = 12_000

/**
 * Starts a local HTTP server serving a minimal page whose favicon is a real,
 * tiny, but non-default PNG (unlike a bare `example.com`-style URL, which
 * Chrome's `_favicon` API would never resolve to anything but the generic
 * globe placeholder here, since this suite's test profile never actually
 * fetches remote pages over the network).
 * @returns The running server and the page URL it serves.
 */
function startFaviconServer(): Promise<{ server: Server; pageUrl: string }> {
  return new Promise((resolve) => {
    const server = createServer((request, response) => {
      if (request.url?.startsWith('/icon.png')) {
        response.writeHead(200, { 'Content-Type': 'image/png' })
        response.end(ICON_PNG)
        return
      }
      response.writeHead(200, { 'Content-Type': 'text/html' })
      response.end(
        '<!doctype html><html><head><link rel="icon" href="/icon.png"></head>' +
          '<body>Icon-heavy auto-export fixture</body></html>',
      )
    })
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      resolve({ server, pageUrl: `http://127.0.0.1:${port}/` })
    })
  })
}

/**
 * Polls the extension's `_favicon` API (the same one `getFaviconBase64` in
 * `lib/favicon.ts` calls) until it returns something other than the default
 * globe placeholder for `pageUrl` — i.e. until Chrome has actually cached a
 * real favicon for it, following the earlier navigation this test does.
 * @param page Any open extension page (used only to `fetch` from the extension's origin).
 * @param extensionId The loaded extension's id.
 * @param pageUrl The page URL to check the cached favicon for.
 */
async function waitForFaviconCached(
  page: Page,
  extensionId: string,
  pageUrl: string,
): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(
          /* eslint-disable unicorn/isolated-functions -- this callback runs in the page's own browser context, where URL/fetch/FileReader are real globals, not the Node/ES-only set this rule checks against */
          async ({ extensionId, pageUrl }) => {
            const faviconUrl = new URL(
              `chrome-extension://${extensionId}/_favicon/?`,
            )
            faviconUrl.searchParams.set('pageUrl', pageUrl)
            faviconUrl.searchParams.set('size', '16')
            const response = await fetch(faviconUrl.href)
            const blob = await response.blob()
            return new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.addEventListener('loadend', () =>
                resolve(reader.result as string),
              )
              reader.addEventListener('error', () => reject(reader.error))
              reader.readAsDataURL(blob)
            })
          },
          /* eslint-enable unicorn/isolated-functions -- scoped to the callback above only */
          { extensionId, pageUrl },
        ),
      { timeout: 20_000, intervals: [250, 500, 1000] },
    )
    .not.toBe(DEFAULT_CHROME_FAVICON)
}

/**
 * Builds {@link ICON_HEAVY_BOOKMARK_COUNT} flat bookmarks, all pointing at
 * `pageUrl` — so they all share the one favicon cached for it.
 * @param pageUrl The URL every bookmark points to.
 * @returns The seed nodes, ready for the `seedBookmarks` fixture.
 */
function buildIconHeavyBookmarks(pageUrl: string): SeedBookmark[] {
  return Array.from({ length: ICON_HEAVY_BOOKMARK_COUNT }, (_, index) => ({
    title: `Icon Heavy Bookmark ${index}`,
    url: pageUrl,
  }))
}

/**
 * A `chrome.downloads.search` result item, trimmed to the fields this test
 * reads.
 */
interface DownloadItem {
  state: string
  filename: string
  mime: string
  startTime: string
}

/**
 * The most recent completed HTML download, per `chrome.downloads.search`.
 * Playwright's `page.waitForEvent('download')` never fires for a download
 * `chrome.downloads.download` initiates from the background service worker
 * (rather than from a page/frame it's tracking) — verified by hand: the
 * download itself completes and lands under Playwright's own
 * `.playwright-artifacts-*` directory, it's simply never surfaced as a page
 * `download` event. So this asserts on the extension's own downloads
 * history instead of a Playwright download event.
 * @param serviceWorker The background service worker fixture.
 * @returns The newest `state: 'complete'` `text/html` download.
 */
async function latestCompletedHtmlDownload(
  serviceWorker: Worker,
): Promise<DownloadItem> {
  const downloads = (await serviceWorker.evaluate(() =>
    chrome.downloads.search({ orderBy: ['-startTime'], limit: 10 }),
  )) as DownloadItem[]
  const match = downloads.find(
    (download) =>
      download.state === 'complete' && download.mime === 'text/html',
  )
  if (!match) {
    throw new Error(
      `No completed text/html download found in: ${JSON.stringify(downloads)}`,
    )
  }
  return match
}

test('Export now downloads an icon-data-heavy export and shows success', async ({
  context,
  extensionId,
  openExtensionPage,
  seedBookmarks,
  serviceWorker,
}) => {
  test.setTimeout(180_000)

  const { server, pageUrl } = await startFaviconServer()
  try {
    const warmupPage = await context.newPage()
    await warmupPage.goto(pageUrl, { waitUntil: 'load' })
    await warmupPage.close()

    const page = await openExtensionPage('app.html#/auto-export')
    await waitForFaviconCached(page, extensionId, pageUrl)

    await seedBookmarks(buildIconHeavyBookmarks(pageUrl))

    await page.getByRole('button', { name: 'Export now' }).click()

    await expect(page.getByText('Export completed')).toBeVisible({
      timeout: 60_000,
    })

    const download = await latestCompletedHtmlDownload(serviceWorker)
    const { size } = await stat(download.filename)
    expect(size).toBeGreaterThan(2 * 1024 * 1024)
  } finally {
    server.close()
  }
})
