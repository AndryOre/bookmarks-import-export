import { i18n } from '#i18n'
import { CheckIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'

interface ImportStepProperties {
  number: number
  title: string
  isComplete: boolean
  children: ReactNode
}

/**
 * One numbered step of the import flow: a badge with the step number (or a
 * check once completed), a heading, and the step's content below.
 * @param root0 This component's properties.
 * @param root0.number One-based position of the step.
 * @param root0.title The step heading.
 * @param root0.isComplete Whether to show a check instead of the number.
 * @param root0.children The step content.
 * @returns The step section.
 */
export function ImportStep({
  number,
  title,
  isComplete,
  children,
}: ImportStepProperties) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <Badge variant={isComplete ? 'default' : 'secondary'}>
          {isComplete ? (
            <>
              <CheckIcon aria-hidden />
              <span className="sr-only">{i18n.t('import_stepDone')}</span>
            </>
          ) : (
            number
          )}
        </Badge>
        {title}
      </h2>
      {children}
    </section>
  )
}
