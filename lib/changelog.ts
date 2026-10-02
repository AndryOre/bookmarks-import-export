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
  dateKey: I18nKey
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
 * Each entry's `dateKey`, `textKey`, and optional `linkKey` are i18n
 * message keys, not literal text, following the naming convention
 * `changelog_<version_with_underscores>_date` for the date and
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

  return [
    {
      version: '1.7.0',
      dateKey: 'changelog_1_7_0_date',
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
      dateKey: 'changelog_1_6_0_date',
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
      dateKey: 'changelog_1_5_0_date',
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
      dateKey: 'changelog_1_4_0_date',
      items: [{ textKey: 'changelog_1_4_0_1' }],
    },
    {
      version: '1.3.0',
      dateKey: 'changelog_1_3_0_date',
      items: [{ textKey: 'changelog_1_3_0_1' }],
    },
    {
      version: '1.2.0',
      dateKey: 'changelog_1_2_0_date',
      items: [{ textKey: 'changelog_1_2_0_1' }],
    },
    {
      version: '1.1.0',
      dateKey: 'changelog_1_1_0_date',
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
      dateKey: 'changelog_1_0_0_date',
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
      dateKey: 'changelog_0_1_1_date',
      items: [
        { textKey: 'changelog_0_1_1_1' },
        { textKey: 'changelog_0_1_1_2' },
        { textKey: 'changelog_0_1_1_3' },
        { textKey: 'changelog_0_1_1_4' },
      ],
    },
    {
      version: '0.1.0',
      dateKey: 'changelog_0_1_0_date',
      items: [
        { textKey: 'changelog_0_1_0_1' },
        { textKey: 'changelog_0_1_0_2' },
        { textKey: 'changelog_0_1_0_3' },
      ],
    },
  ]
}
