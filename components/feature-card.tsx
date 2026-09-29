import { i18n } from '#i18n'
import type { LucideIcon } from 'lucide-react'

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface FeatureCardProps {
  icon: LucideIcon
  titleKey: string
  descriptionKey: string
  className?: string
}

export function FeatureCard({
  icon: Icon,
  titleKey,
  descriptionKey,
  className,
}: FeatureCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="w-fit rounded-lg bg-muted p-2">
          <Icon className="size-6" />
        </div>
        <CardTitle className="text-sm font-semibold">
          {i18n.t(titleKey as any)}
        </CardTitle>
        <CardDescription className="text-xs">
          {i18n.t(descriptionKey as any)}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
