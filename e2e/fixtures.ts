/// <reference types="chrome" />
import { test as base, chromium } from '@playwright/test'
import type { BrowserContext, Page, Worker } from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const EXTENSION_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../.output/chrome-mv3',
)

/**
 * A bookmark or folder to create via {@link ExtensionFixtures.seedBookmarks},
 * nested the same way `chrome.bookmarks.create` accepts: a node with no
 * `url` becomes a folder, and its `children` are created underneath it.
 */
export type SeedBookmark = {
  title: string
  url?: string
  children?: SeedBookmark[]
}

/**
 * The fixtures `e2e/fixtures.ts` adds on top of `@playwright/test`'s base
 * `test`, shared across every spec in this suite (the smoke spec here, and
 * the popup and app page specs other E2E
 * tickets add) so each one loads the same built extension the same way
 * instead of reimplementing `launchPersistentContext` setup.
 */
type ExtensionFixtures = {
  browserLocale: string | undefined
  context: BrowserContext
  extensionId: string
  serviceWorker: Worker
  openExtensionPage: (pageName: string) => Promise<Page>
  seedBookmarks: (nodes: SeedBookmark[]) => Promise<void>
  readBookmarkTree: () => Promise<chrome.bookmarks.BookmarkTreeNode[]>
  seedStorage: (values: Record<string, unknown>) => Promise<void>
}

/**
 * Playwright `test`, extended with fixtures that load this repo's built
 * extension (`.output/chrome-mv3`, produced by `wxt build`) into a fresh,
 * temporary Chromium profile for every test. See
 * `docs/adr/0003-e2e-against-built-extension.md` for why E2E runs against
 * the real built extension instead of a component-test layer, and why
 * bookmarks are seeded/read through the service worker rather than
 * `fakeBrowser`.
 */
export const test = base.extend<ExtensionFixtures>({
  browserLocale: [undefined, { option: true }],

  context: async ({ browserLocale, deviceScaleFactor, viewport }, use) => {
    const userDataDirectory = await mkdtemp(path.join(tmpdir(), 'snug-e2e-'))

    const context = await chromium.launchPersistentContext(userDataDirectory, {
      channel: 'chromium',
      locale: browserLocale,
      deviceScaleFactor,
      viewport,
      headless: !process.env.PWDEBUG,
      args: [
        `--disable-extensions-except=${EXTENSION_DIR}`,
        `--load-extension=${EXTENSION_DIR}`,
        ...(browserLocale ? [`--lang=${browserLocale}`] : []),
      ],
      env: browserLocale
        ? { ...process.env, LANGUAGE: browserLocale }
        : undefined,
    })

    await use(context)

    await context.close()
    await rm(userDataDirectory, { recursive: true, force: true })
  },

  serviceWorker: async ({ context }, use) => {
    let [worker] = context.serviceWorkers()
    worker ??= await context.waitForEvent('serviceworker')
    await use(worker)
  },

  extensionId: async ({ serviceWorker }, use) => {
    await use(new URL(serviceWorker.url()).hostname)
  },

  openExtensionPage: async ({ context, extensionId }, use) => {
    await use(async (pageName) => {
      const page = await context.newPage()
      await page.goto(`chrome-extension://${extensionId}/${pageName}`)
      return page
    })
  },

  seedBookmarks: async ({ serviceWorker }, use) => {
    await use(async (nodes) => {
      await serviceWorker.evaluate(async (seed: SeedBookmark[]) => {
        const createRecursively = async (
          node: SeedBookmark,
          parentId?: string,
        ): Promise<void> => {
          const created = await chrome.bookmarks.create({
            parentId,
            title: node.title,
            url: node.url,
          })
          const children = node.children ?? []
          for (const child of children) {
            await createRecursively(child, created.id)
          }
        }
        for (const node of seed) {
          await createRecursively(node)
        }
      }, nodes)
    })
  },

  readBookmarkTree: async ({ serviceWorker }, use) => {
    await use(() => serviceWorker.evaluate(() => chrome.bookmarks.getTree()))
  },

  /**
   * Writes directly to `chrome.storage.local`, keyed the way
   * `storage.defineItem('local:key', ...)` reads it: the `local:` area
   * prefix is stripped before hitting `chrome.storage.local`, so callers
   * pass the raw key (e.g. `autoExportConfig` for `autoExportConfigStore`).
   * @param root0 The fixture context.
   * @param root0.serviceWorker The extension's service worker fixture.
   * @param use Playwright's fixture callback, called with the `seedStorage` function.
   */
  seedStorage: async ({ serviceWorker }, use) => {
    await use(async (values) => {
      await serviceWorker.evaluate(
        (seed: Record<string, unknown>) => chrome.storage.local.set(seed),
        values,
      )
    })
  },
})

export { expect } from '@playwright/test'
