import {
  FileJson,
  FileText,
  FileSpreadsheet,
  BookmarkPlus,
  Settings,
  Languages,
  Globe,
  Star,
} from 'lucide-react';
import { FeatureCard } from '@/components/feature-card';
import { i18n } from '#i18n';

const FEATURE_CARDS = [
  { icon: FileJson, titleKey: 'exportFeature', descKey: 'exportFeatureDescription' },
  { icon: FileText, titleKey: 'importFeature', descKey: 'importFeatureDescription' },
  { icon: FileSpreadsheet, titleKey: 'advancedExportFeature', descKey: 'advancedExportFeatureDescription' },
  { icon: BookmarkPlus, titleKey: 'multiFormatFeature', descKey: 'multiFormatFeatureDescription' },
  { icon: Settings, titleKey: 'settingsFeature', descKey: 'settingsFeatureDescription' },
  { icon: Languages, titleKey: 'i18nFeature', descKey: 'i18nFeatureDescription' },
] as const;

const CHROME_WEB_STORE_URL = 'https://chromewebstore.google.com/detail/bookmark-importexport/gdhpeilfkeeajillmcncaelnppiakjhn';
const GITHUB_URL = 'https://github.com/AndryOre/bookmarks-import-export';
const TWITTER_URL = 'https://x.com/andryore';

export default function App() {
  return (
    <main className="flex flex-col items-center min-h-screen overflow-auto gap-6 p-6">
      <img
        src={browser.runtime.getURL('/icons/128.png')}
        alt={i18n.t('extensionName')}
        className="w-24 h-24"
      />

      <div className="text-center">
        <h1 className="text-2xl font-bold">{i18n.t('welcomeTitle')}</h1>
        <p className="text-muted-foreground">{i18n.t('welcomeSubtitle')}</p>
      </div>

      <section className="w-full max-w-2xl">
        <h2 className="text-lg font-semibold mb-3">{i18n.t('gettingStarted')}</h2>

        <div className="grid grid-cols-2 gap-3">
          {FEATURE_CARDS.map(({ icon, titleKey, descKey }) => (
            <FeatureCard
              key={titleKey}
              icon={icon}
              titleKey={titleKey}
              descriptionKey={descKey}
            />
          ))}

          <FeatureCard
            icon={Globe}
            titleKey="compatibleBrowsers"
            descriptionKey="compatibleBrowsersDescription"
            className="col-span-2"
          />
        </div>
      </section>

      <a
        href={CHROME_WEB_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm font-medium hover:underline"
      >
        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
        {i18n.t('feedbackLink')}
      </a>

      <footer className="flex gap-4 text-sm text-muted-foreground mt-auto">
        <a
          href={TWITTER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          @AndryOre
        </a>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          GitHub
        </a>
      </footer>
    </main>
  );
}
