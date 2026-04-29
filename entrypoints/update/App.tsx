import { Star } from 'lucide-react';
import { i18n } from '#i18n';
import { getChangelog } from '@/lib/changelog';

const CHROME_WEB_STORE_URL = 'https://chromewebstore.google.com/detail/bookmark-importexport/gdhpeilfkeeajillmcncaelnppiakjhn';
const GITHUB_URL = 'https://github.com/AndryOre/bookmarks-import-export';
const TWITTER_URL = 'https://x.com/andryore';

export default function App() {
  const version = browser.runtime.getManifest().version;
  const changelog = getChangelog();

  return (
    <main className="flex flex-col items-center min-h-screen overflow-auto gap-6 p-6">
      <img
        src={browser.runtime.getURL('/icon/96.png')}
        alt={i18n.t('extensionName')}
        className="w-24 h-24"
      />

      <div className="text-center">
        <h1 className="text-2xl font-bold">{i18n.t('extensionName')}</h1>
        <p className="text-muted-foreground">{i18n.t('currentVersion', [version])}</p>
      </div>

      {/* Feedback — ANTES del changelog */}
      <section className="w-full max-w-2xl text-center">
        <h2 className="text-lg font-semibold">{i18n.t('updateFeedback')}</h2>
        <p className="text-muted-foreground text-sm mb-3">
          {i18n.t('updateFeedbackDescription')}
        </p>
        <a
          href={CHROME_WEB_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
        >
          <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
          {i18n.t('feedbackLink')}
        </a>
      </section>

      {/* Changelog */}
      <section className="w-full max-w-2xl">
        <h2 className="text-lg font-semibold mb-4">{i18n.t('changelogTitle')}</h2>

        <div className="space-y-6">
          {changelog.map(({ version: v, dateKey, items }) => (
            <div key={v}>
              <h3 className="font-semibold text-base">
                {v} — <span className="text-muted-foreground font-normal">{i18n.t(dateKey as any)}</span>
              </h3>
              <ul className="list-disc list-outside ml-4 mt-1 space-y-1">
                {items.map(({ textKey, linkKey, linkUrl }) => (
                  <li key={textKey} className="text-sm text-muted-foreground">
                    {i18n.t(textKey as any)}
                    {linkKey && linkUrl && (
                      <>
                        {' '}
                        <a
                          href={linkUrl}
                          className="text-foreground underline hover:no-underline"
                        >
                          {i18n.t(linkKey as any)}
                        </a>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <footer className="flex gap-4 text-sm text-muted-foreground mt-auto">
        <a href={TWITTER_URL} target="_blank" rel="noopener noreferrer" className="hover:underline">
          @AndryOre
        </a>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:underline">
          GitHub
        </a>
      </footer>
    </main>
  );
}
