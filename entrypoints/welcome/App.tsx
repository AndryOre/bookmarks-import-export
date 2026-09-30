import { i18n } from '#i18n'
import {
  BookmarkPlus,
  FileJson,
  FileSpreadsheet,
  FileText,
  Globe,
  Languages,
  Settings,
  Star,
} from 'lucide-react'

import { FeatureCard } from '@/components/feature-card'

const FEATURE_CARDS = [
  {
    icon: FileJson,
    titleKey: 'exportFeature',
    descKey: 'exportFeatureDescription',
  },
  {
    icon: FileText,
    titleKey: 'importFeature',
    descKey: 'importFeatureDescription',
  },
  {
    icon: FileSpreadsheet,
    titleKey: 'advancedExportFeature',
    descKey: 'advancedExportFeatureDescription',
  },
  {
    icon: BookmarkPlus,
    titleKey: 'multiFormatFeature',
    descKey: 'multiFormatFeatureDescription',
  },
  {
    icon: Settings,
    titleKey: 'settingsFeature',
    descKey: 'settingsFeatureDescription',
  },
  {
    icon: Languages,
    titleKey: 'i18nFeature',
    descKey: 'i18nFeatureDescription',
  },
] as const

const CHROME_WEB_STORE_URL =
  'https://chromewebstore.google.com/detail/bookmark-importexport/gdhpeilfkeeajillmcncaelnppiakjhn'
const GITHUB_URL = 'https://github.com/AndryOre/bookmarks-import-export'
const TWITTER_URL = 'https://x.com/andryore'

export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-6 overflow-auto p-6">
      <img
        src={browser.runtime.getURL('/icons/128.png')}
        alt={i18n.t('extensionName')}
        className="h-24 w-24"
      />

      <div className="text-center">
        <h1 className="text-2xl font-bold">{i18n.t('welcomeTitle')}</h1>
        <p className="text-muted-foreground">{i18n.t('welcomeSubtitle')}</p>
      </div>

      <section className="w-full max-w-2xl">
        <h2 className="mb-3 text-lg font-semibold">
          {i18n.t('gettingStarted')}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {FEATURE_CARDS.map(({ icon, titleKey, descKey }) => (
            <FeatureCard
              key={titleKey}
              icon={icon}
              titleKey={titleKey}
              descriptionKey={descKey}
            />
          ))}

          <div className="col-span-2">
            <FeatureCard
              icon={Globe}
              titleKey="compatibleBrowsers"
              descriptionKey="compatibleBrowsersDescription"
            />
          </div>
        </div>
      </section>

      <a
        href={CHROME_WEB_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm font-medium hover:underline"
      >
        <Star className="h-5 w-5 fill-rating text-rating" />
        {i18n.t('feedbackLink')}
      </a>

      <footer className="mt-auto flex gap-4 text-sm text-muted-foreground">
        <a
          href={TWITTER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {i18n.t('twitterHandle')}
        </a>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {i18n.t('githubLink')}
        </a>
      </footer>
    </main>
  )
}
