import { describe, expect, it } from 'vitest'

import wxtConfig from '../wxt.config'

interface ManifestNameMessages {
  extensionManifestName: { message: string }
}

const localeMessages = import.meta.glob<ManifestNameMessages>(
  '../locales/*.json',
  { eager: true, import: 'default' },
)
const listingSources = import.meta.glob<string>('../docs/store/listings/*.md', {
  eager: true,
  import: 'default',
  query: '?raw',
})
const storeReadme = Object.values(
  import.meta.glob<string>('../docs/store/README.md', {
    eager: true,
    import: 'default',
    query: '?raw',
  }),
)[0]

/**
 * @param path A glob key such as `../locales/pt_BR.json`.
 * @returns The locale code, such as `pt_BR`.
 */
function localeCode(path: string): string {
  return path.replace(/^.*\//, '').replace(/\.(json|md)$/, '')
}

/**
 * @param code A locale code.
 * @returns That locale's `extensionManifestName` message.
 */
function manifestName(code: string): string | undefined {
  return Object.entries(localeMessages).find(
    ([path]) => localeCode(path) === code,
  )?.[1].extensionManifestName.message
}

/**
 * @param markdown A store listing file.
 * @returns The first line under its `## Title` heading.
 */
function listingTitle(markdown: string): string | undefined {
  return /^## Title\s+(.+)$/m.exec(markdown)?.[1]
}

const manifest = wxtConfig.manifest as Record<string, unknown> & {
  permissions: string[]
}

describe('manifest', () => {
  it('has no tabs permission', () => {
    expect(manifest.permissions).not.toContain('tabs')
  })

  it('requires Chrome 119 and links the repository', () => {
    expect(manifest.minimum_chrome_version).toBe('119')
    expect(manifest.homepage_url).toMatch(/^https:\/\/github\.com\//)
  })

  it('names the extension with the manifest-only message', () => {
    expect(manifest.name).toBe('__MSG_extensionManifestName__')
  })
})

describe('extensionManifestName', () => {
  it.each(Object.keys(localeMessages).map((path) => localeCode(path)))(
    'is defined in %s',
    (code) => {
      expect(manifestName(code)?.length).toBeGreaterThan(0)
    },
  )

  it.each(
    Object.entries(listingSources)
      .map(([path, markdown]) => [localeCode(path), markdown] as const)
      .filter(([code]) => code !== 'TEMPLATE'),
  )('matches the store listing title in %s', (code, markdown) => {
    expect(manifestName(code)).toBe(listingTitle(markdown))
  })

  it.each([
    ['en', 'Snug: Bookmark Export, Import & Backup'],
    ['es', 'Snug: exporta, importa y respalda marcadores'],
  ])('matches the store README title for %s', (code, title) => {
    expect(storeReadme).toContain(title)
    expect(manifestName(code)).toBe(title)
  })
})
