export interface ChangelogEntry {
  version: string;
  dateKey: string;
  items: ChangelogItem[];
}

export interface ChangelogItem {
  textKey: string;
  linkKey?: string;
  linkUrl?: string;
}

export function getChangelog(): ChangelogEntry[] {
  const advancedExportUrl = browser.runtime.getURL('/advanced-export.html');

  return [
    {
      version: '1.4.0',
      dateKey: 'changelog_1_4_0_date',
      items: [
        { textKey: 'changelog_1_4_0_1' },
      ],
    },
    {
      version: '1.3.0',
      dateKey: 'changelog_1_3_0_date',
      items: [
        { textKey: 'changelog_1_3_0_1' },
      ],
    },
    {
      version: '1.2.0',
      dateKey: 'changelog_1_2_0_date',
      items: [
        { textKey: 'changelog_1_2_0_1' },
      ],
    },
    {
      version: '1.1.0',
      dateKey: 'changelog_1_1_0_date',
      items: [
        { textKey: 'changelog_1_1_0_1' },
        {
          textKey: 'changelog_1_1_0_2',
          linkKey: 'changelog_1_1_0_2_link',
          linkUrl: advancedExportUrl,
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
          linkUrl: advancedExportUrl,
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
  ];
}
