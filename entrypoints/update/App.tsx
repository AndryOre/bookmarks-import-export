import { i18n } from '#i18n'
import { Star } from 'lucide-react'

import { getChangelog } from '@/lib/changelog'

const CHROME_WEB_STORE_URL =
  'https://chromewebstore.google.com/detail/bookmark-importexport/gdhpeilfkeeajillmcncaelnppiakjhn'
const GITHUB_URL = 'https://github.com/AndryOre/bookmarks-import-export'
const TWITTER_URL = 'https://x.com/andryore'

export default function App() {
  const version = browser.runtime.getManifest().version
  const changelog = getChangelog()

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 overflow-auto p-6">
      <img
        src={browser.runtime.getURL('/icons/128.png')}
        alt={i18n.t('extensionName')}
        className="h-24 w-24"
      />

      <div className="text-center">
        <h1 className="text-2xl font-bold">{i18n.t('extensionName')}</h1>
        <p className="text-muted-foreground">
          {i18n.t('currentVersion', [version])}
        </p>
      </div>

      {/* Feedback — ANTES del changelog */}
      <section className="w-full max-w-2xl text-center">
        <h2 className="text-lg font-semibold">{i18n.t('updateFeedback')}</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          {i18n.t('updateFeedbackDescription')}
        </p>
        <a
          href={CHROME_WEB_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
        >
          <Star className="h-6 w-6 fill-rating text-rating" />
          {i18n.t('feedbackLink')}
        </a>
      </section>

      {/* Changelog */}
      <section className="w-full max-w-2xl">
        <h2 className="mb-4 text-lg font-semibold">
          {i18n.t('changelogTitle')}
        </h2>

        <div className="space-y-6">
          {changelog.map(({ version: v, dateKey, items }) => (
            <div key={v}>
              <h3 className="text-base font-semibold">
                {v} —{' '}
                <span className="font-normal text-muted-foreground">
                  {i18n.t(dateKey)}
                </span>
              </h3>
              <ul className="mt-1 ml-4 list-outside list-disc space-y-1">
                {items.map(({ textKey, linkKey, linkUrl }) => (
                  <li key={textKey} className="text-sm text-muted-foreground">
                    {i18n.t(textKey)}
                    {linkKey && linkUrl && (
                      <>
                        {' '}
                        <a
                          href={linkUrl}
                          className="text-foreground underline hover:no-underline"
                        >
                          {i18n.t(linkKey)}
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
