import * as SwitchPrimitives from "@radix-ui/react-switch"
import * as React from "react"

import { cn } from "~common/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "plasmo-peer plasmo-inline-flex plasmo-h-6 plasmo-w-11 plasmo-shrink-0 plasmo-cursor-pointer plasmo-items-center plasmo-rounded-full plasmo-border-2 plasmo-border-transparent plasmo-transition-colors focus-visible:plasmo-outline-none focus-visible:plasmo-ring-2 focus-visible:plasmo-ring-ring focus-visible:plasmo-ring-offset-2 focus-visible:plasmo-ring-offset-background disabled:plasmo-cursor-not-allowed disabled:plasmo-opacity-50 data-[state=checked]:plasmo-bg-primary data-[state=unchecked]:plasmo-bg-input",
      className
    )}
    {...props}
    ref={ref}>
    <SwitchPrimitives.Thumb
      className={cn(
        "plasmo-pointer-events-none plasmo-block plasmo-h-5 plasmo-w-5 plasmo-rounded-full plasmo-bg-background plasmo-shadow-lg plasmo-ring-0 plasmo-transition-transform data-[state=checked]:plasmo-translate-x-5 data-[state=unchecked]:plasmo-translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
