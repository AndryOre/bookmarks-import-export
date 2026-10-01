import type * as React from 'react'

import { cn } from '@/lib/utils'

function Label({ className, ...properties }: React.ComponentProps<'label'>) {
  return (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control -- generic wrapper; association (htmlFor/children) is supplied by call sites via ...properties, invisible to static analysis
    <label
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...properties}
    />
  )
}

export { Label }
