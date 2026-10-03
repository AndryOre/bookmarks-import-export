import { i18n } from '#i18n'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item'
import { CHROME_WEB_STORE_URL } from '@/lib/brand'
import { formatChangelogDate, getChangelog } from '@/lib/changelog'
import { isChangelogEntryCurrent } from '@/lib/version'

/**
 * The What's new screen: a changelog timeline (newest first, installed
 * version flagged "Current") ending with a low-key review request. Opening it
 * marks the installed version as seen — the app shell owns that, since it
 * also drives the sidebar dot. The page `h1` is rendered by the shell.
 * @returns The changelog view.
 */
export function WhatsNewRoute() {
  const installedVersion = browser.runtime.getManifest().version
  const changelog = getChangelog()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <ol className="flex flex-col">
        {changelog.map(({ version, isoDate, items }, index) => {
          const isLast = index === changelog.length - 1
          return (
            <li key={version} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className="mt-2 size-2.5 shrink-0 rounded-full bg-primary"
                />
                {!isLast && (
                  <span aria-hidden="true" className="w-px flex-1 bg-border" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 pb-8">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-base font-semibold">
                    {version}
                  </h2>
                  {isChangelogEntryCurrent(version, installedVersion) && (
                    <Badge>{i18n.t('whatsNew_current')}</Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {formatChangelogDate(isoDate, browser.i18n.getUILanguage())}
                  </span>
                </div>
                <ul className="ml-4 flex list-outside list-disc flex-col gap-1">
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
            </li>
          )
        })}
      </ol>

      <Item variant="muted">
        <ItemContent>
          <ItemTitle>{i18n.t('whatsNew_reviewTitle')}</ItemTitle>
          <ItemDescription>
            {i18n.t('whatsNew_reviewDescription')}
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <a
            href={CHROME_WEB_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            {i18n.t('whatsNew_reviewAction')}
          </a>
        </ItemActions>
      </Item>
    </div>
  )
}
