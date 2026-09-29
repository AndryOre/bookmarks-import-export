import type { LucideIcon } from 'lucide-react'

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { t } from '@/lib/types'
import type { MessageKey } from '@/lib/types'

interface FeatureCardProperties {
  icon: LucideIcon
  titleKey: MessageKey
  descriptionKey: MessageKey
  className?: string
}

export function FeatureCard({
  icon: Icon,
  titleKey,
  descriptionKey,
  className,
}: FeatureCardProperties) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="w-fit rounded-lg bg-muted p-2">
          <Icon className="size-6" />
        </div>
        <CardTitle className="text-sm font-semibold">{t(titleKey)}</CardTitle>
        <CardDescription className="text-xs">
          {t(descriptionKey)}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
