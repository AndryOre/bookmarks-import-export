import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check, Minus } from "lucide-react"
import * as React from "react"

import { cn } from "~common/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "plasmo-group plasmo-peer plasmo-h-4 plasmo-w-4 plasmo-shrink-0 plasmo-rounded-sm plasmo-border plasmo-border-primary plasmo-ring-offset-background focus-visible:plasmo-outline-none focus-visible:plasmo-ring-2 focus-visible:plasmo-ring-ring focus-visible:plasmo-ring-offset-2 disabled:plasmo-cursor-not-allowed disabled:plasmo-opacity-50 data-[state=checked]:plasmo-bg-primary data-[state=checked]:plasmo-text-primary-foreground data-[state=indeterminate]:plasmo-bg-primary data-[state=indeterminate]:plasmo-text-primary-foreground",
      className
    )}
    {...props}>
    <CheckboxPrimitive.Indicator
      className={cn(
        "plasmo-flex plasmo-items-center plasmo-justify-center plasmo-text-current"
      )}>
      <Check className="plasmo-h-4 plasmo-w-4 plasmo-hidden group-data-[state=checked]:plasmo-block" />
      <Minus className="plasmo-h-4 plasmo-w-4 plasmo-hidden group-data-[state=indeterminate]:plasmo-block" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
