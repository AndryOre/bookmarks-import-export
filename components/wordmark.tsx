import { cn } from 'cn'

import { PRODUCT_NAME } from '@/lib/brand'

const GRADIENT_PREFIX_LENGTH = 2

/**
 * The Snug wordmark: the product name set in the heading font, with a brand
 * gradient on its first two letters. Both parts are real text, so assistive
 * tech reads "Snug". The caller sizes it with text size classes.
 * @param props The component props.
 * @param props.className Extra classes, typically a text size.
 * @returns The wordmark element.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-heading font-bold tracking-tight', className)}>
      <span className="bg-brand-text-gradient bg-clip-text text-transparent">
        {PRODUCT_NAME.slice(0, GRADIENT_PREFIX_LENGTH)}
      </span>
      <span>{PRODUCT_NAME.slice(GRADIENT_PREFIX_LENGTH)}</span>
    </span>
  )
}
