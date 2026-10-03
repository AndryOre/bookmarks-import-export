import type { GeneratedI18nStructure } from '#i18n'

import { APP_ROUTES, getAppUrl } from './app-url'

/**
 * Every changelog key is rendered as plain, argument-less text, so this
 * narrows to the subset of `i18n.t()` keys valid for that call shape
 * (matches the first overload of `TFunction` in `@wxt-dev/i18n`).
 */
type I18nKey = {
  [K in keyof GeneratedI18nStructure]: GeneratedI18nStructure[K] extends {
    plural: false
    substitutions: 0
  }
    ? K
    : never
}[keyof GeneratedI18nStructure]

export interface ChangelogEntry {
  version: string
  isoDate: string
  items: ChangelogItem[]
}

interface ChangelogItem {
  textKey: I18nKey
  linkKey?: I18nKey
  linkUrl?: string
}

/**
 * Returns the in-app changelog, newest release first. Entries are
 * maintained by hand on each release — there is no build step or script
 * that generates this list from `CHANGELOG.md`, git tags, or anything
 * else, so a new release means adding an entry here directly.
 *
 * Each entry's `isoDate` is a `YYYY-MM-DD` release date, rendered with
 * `formatChangelogDate`. Its `textKey` and optional `linkKey` are i18n
 * message keys, not literal text, following the naming convention
 * `changelog_<version_with_underscores>_<item_index>[_link]` for each
 * item and its optional link label (see the generated
 * `GeneratedI18nStructure` for the actual message strings). `linkUrl`
 * pairs with `linkKey` to make an item's link label point at an
 * App route (built with `getAppUrl`).
 *
 * The root `CHANGELOG.md` mirrors these entries for human readers outside
 * the extension and must be kept in sync by hand alongside this function.
 * @returns The changelog entries, newest release first.
 */
export function getChangelog(): ChangelogEntry[] {
  const exportUrl = getAppUrl(APP_ROUTES.export)
  const importUrl = getAppUrl(APP_ROUTES.import)
  const autoExportUrl = getAppUrl(APP_ROUTES.autoExport)
  const duplicatesUrl = getAppUrl(APP_ROUTES.duplicates)

  return [
    {
      version: '2.0.0',
      isoDate: '2026-10-02',
      items: [
        {
          textKey: 'changelog_2_0_0_1',
        },
        {
          textKey: 'changelog_2_0_0_2',
          linkKey: 'changelog_2_0_0_2_link',
          linkUrl: exportUrl,
        },
        { textKey: 'changelog_2_0_0_3' },
        { textKey: 'changelog_2_0_0_4' },
        {
          textKey: 'changelog_2_0_0_5',
          linkKey: 'changelog_2_0_0_5_link',
          linkUrl: duplicatesUrl,
        },
        {
          textKey: 'changelog_2_0_0_6',
          linkKey: 'changelog_2_0_0_6_link',
          linkUrl: autoExportUrl,
        },
        { textKey: 'changelog_2_0_0_7' },
        { textKey: 'changelog_2_0_0_8' },
      ],
    },
    {
      version: '1.7.0',
      isoDate: '2026-10-01',
      items: [
        {
          textKey: 'changelog_1_7_0_1',
          linkKey: 'changelog_1_7_0_1_link',
          linkUrl: autoExportUrl,
        },
        {
          textKey: 'changelog_1_7_0_2',
        },
      ],
    },
    {
      version: '1.6.0',
      isoDate: '2026-04-29',
      items: [
        {
          textKey: 'changelog_1_6_0_1',
          linkKey: 'changelog_1_6_0_1_link',
          linkUrl: autoExportUrl,
        },
      ],
    },
    {
      version: '1.5.0',
      isoDate: '2025-04-29',
      items: [
        {
          textKey: 'changelog_1_5_0_1',
          linkKey: 'changelog_1_5_0_1_link',
          linkUrl: importUrl,
        },
      ],
    },
    {
      version: '1.4.0',
      isoDate: '2025-04-29',
      items: [{ textKey: 'changelog_1_4_0_1' }],
    },
    {
      version: '1.3.0',
      isoDate: '2025-02-16',
      items: [{ textKey: 'changelog_1_3_0_1' }],
    },
    {
      version: '1.2.0',
      isoDate: '2025-02-14',
      items: [{ textKey: 'changelog_1_2_0_1' }],
    },
    {
      version: '1.1.0',
      isoDate: '2025-02-13',
      items: [
        { textKey: 'changelog_1_1_0_1' },
        {
          textKey: 'changelog_1_1_0_2',
          linkKey: 'changelog_1_1_0_2_link',
          linkUrl: exportUrl,
        },
      ],
    },
    {
      version: '1.0.0',
      isoDate: '2024-08-05',
      items: [
        {
          textKey: 'changelog_1_0_0_1',
          linkKey: 'changelog_1_0_0_1_link',
          linkUrl: exportUrl,
        },
        { textKey: 'changelog_1_0_0_2' },
        { textKey: 'changelog_1_0_0_3' },
      ],
    },
    {
      version: '0.1.1',
      isoDate: '2024-08-04',
      items: [
        { textKey: 'changelog_0_1_1_1' },
        { textKey: 'changelog_0_1_1_2' },
        { textKey: 'changelog_0_1_1_3' },
        { textKey: 'changelog_0_1_1_4' },
      ],
    },
    {
      version: '0.1.0',
      isoDate: '2024-08-03',
      items: [
        { textKey: 'changelog_0_1_0_1' },
        { textKey: 'changelog_0_1_0_2' },
        { textKey: 'changelog_0_1_0_3' },
      ],
    },
  ]
}

/**
 * Formats a changelog `YYYY-MM-DD` release date for display. The date is
 * parsed and formatted in UTC so the shown day never shifts with the
 * viewer's timezone.
 * @param isoDate The release date as `YYYY-MM-DD`.
 * @param locale A BCP 47 locale tag; defaults to the runtime locale.
 * @returns The long-form localized date, such as `October 2, 2026`.
 */
export function formatChangelogDate(isoDate: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`))
}
