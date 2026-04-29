import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { i18n } from '#i18n';

interface FeatureCardProps {
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
  className?: string;
}

export function FeatureCard({ icon: Icon, titleKey, descriptionKey, className }: FeatureCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="p-2 bg-muted rounded-lg w-fit">
          <Icon className="size-6" />
        </div>
        <CardTitle className="text-sm font-semibold">{i18n.t(titleKey as any)}</CardTitle>
        <CardDescription className="text-xs">{i18n.t(descriptionKey as any)}</CardDescription>
      </CardHeader>
    </Card>
  );
}
