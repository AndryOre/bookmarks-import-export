import { type LucideIcon } from "lucide-react"

import { Card, CardDescription, CardHeader, CardTitle } from "~components/ui"

/**
 * Props for the FeatureCard component.
 */
interface FeatureCardProps {
  /** Lucide icon component to display */
  icon: LucideIcon
  /** Title of the feature */
  title: string
  /** Description of the feature */
  description: string
}

/**
 * FeatureCard component to display a single feature of the extension.
 * This component renders a card with an icon, title, and description.
 *
 * @param {FeatureCardProps} props - The properties for the FeatureCard
 * @param {LucideIcon} props.icon - The Lucide icon component to display
 * @param {string} props.title - The title of the feature
 * @param {string} props.description - The description of the feature
 * @returns {JSX.Element} Rendered FeatureCard component
 */
export function FeatureCard({
  icon: Icon,
  title,
  description
}: FeatureCardProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <div className="plasmo-flex plasmo-flex-row plasmo-gap-4 plasmo-items-center">
          <div className="plasmo-p-2 plasmo-bg-muted plasmo-rounded-lg">
            <Icon />
          </div>
          <CardTitle className="plasmo-text-2xl">{title}</CardTitle>
        </div>
        <CardDescription className="plasmo-text-sm">
          {description}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
