import * as SeparatorPrimitive from "@radix-ui/react-separator"
import * as React from "react"

import { cn } from "~common/lib/utils"

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "plasmo-shrink-0 plasmo-bg-border",
        orientation === "horizontal"
          ? "plasmo-h-[1px] plasmo-w-full"
          : "plasmo-h-full plasmo-w-[1px]",
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }
