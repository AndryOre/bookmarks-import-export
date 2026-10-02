import { i18n } from '#i18n'
import { Link } from '@tanstack/react-router'
import {
  CloudUploadIcon,
  DownloadIcon,
  type LucideIcon,
  TimerResetIcon,
} from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { Wordmark } from '@/components/wordmark'
import { APP_ROUTES } from '@/lib/app-url'

interface QuickStartAction {
  icon: LucideIcon
  route: string
  titleKey:
    'welcome_exportTitle' | 'welcome_autoExportTitle' | 'welcome_importTitle'
  descriptionKey:
    | 'welcome_exportDescription'
    | 'welcome_autoExportDescription'
    | 'welcome_importDescription'
  actionKey:
    'welcome_exportAction' | 'welcome_autoExportAction' | 'welcome_importAction'
}

const QUICK_START_ACTIONS: QuickStartAction[] = [
  {
    icon: DownloadIcon,
    route: APP_ROUTES.export,
    titleKey: 'welcome_exportTitle',
    descriptionKey: 'welcome_exportDescription',
    actionKey: 'welcome_exportAction',
  },
  {
    icon: TimerResetIcon,
    route: APP_ROUTES.autoExport,
    titleKey: 'welcome_autoExportTitle',
    descriptionKey: 'welcome_autoExportDescription',
    actionKey: 'welcome_autoExportAction',
  },
  {
    icon: CloudUploadIcon,
    route: APP_ROUTES.import,
    titleKey: 'welcome_importTitle',
    descriptionKey: 'welcome_importDescription',
    actionKey: 'welcome_importAction',
  },
]

/**
 * The first-run Welcome screen: a centered hero followed by three quick-start
 * actions that deep-link to Export, Auto-export and Import. The page `h1` is
 * rendered by the app shell, so the hero title is an `h2`.
 * @returns The welcome view.
 */
export function WelcomeRoute() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <img
          src={browser.runtime.getURL('/icons/128.png')}
          alt=""
          className="size-16"
        />
        <h2 className="font-heading text-2xl font-semibold">
          {i18n.t('welcome_heroTitle')} <Wordmark />
        </h2>
        <p className="text-muted-foreground">{i18n.t('welcomeSubtitle')}</p>
      </div>

      <ItemGroup>
        {QUICK_START_ACTIONS.map(
          ({ icon: Icon, route, titleKey, descriptionKey, actionKey }) => (
            <Item key={route} variant="outline">
              <ItemMedia variant="icon">
                <Icon />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{i18n.t(titleKey)}</ItemTitle>
                <ItemDescription>{i18n.t(descriptionKey)}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Link
                  to={route}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  {i18n.t(actionKey)}
                </Link>
              </ItemActions>
            </Item>
          ),
        )}
      </ItemGroup>
    </div>
  )
}
