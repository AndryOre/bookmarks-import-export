import { i18n } from '#i18n'

/**
 * Labelled stand-in rendered by every route that has no screen yet.
 * @returns The placeholder text.
 */
export function RoutePlaceholder() {
  return (
    <p className="text-sm text-muted-foreground">
      {i18n.t('shell_placeholder')}
    </p>
  )
}
