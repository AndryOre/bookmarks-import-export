import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "~lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "plasmo-inline-flex plasmo-h-10 plasmo-items-center plasmo-justify-center plasmo-rounded-md plasmo-bg-neutral-100 plasmo-p-1 plasmo-text-neutral-500 dark:plasmo-bg-neutral-800 dark:plasmo-text-neutral-400",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "plasmo-inline-flex plasmo-items-center plasmo-justify-center plasmo-whitespace-nowrap plasmo-rounded-sm plasmo-px-3 plasmo-py-1.5 plasmo-text-sm plasmo-font-medium plasmo-ring-offset-white plasmo-transition-all focus-visible:plasmo-outline-none focus-visible:plasmo-ring-2 focus-visible:plasmo-ring-neutral-950 focus-visible:plasmo-ring-offset-2 disabled:plasmo-pointer-events-none disabled:plasmo-opacity-50 data-[state=active]:plasmo-bg-white data-[state=active]:plasmo-text-neutral-950 data-[state=active]:plasmo-shadow-sm dark:plasmo-ring-offset-neutral-950 dark:focus-visible:plasmo-ring-neutral-300 dark:data-[state=active]:plasmo-bg-neutral-950 dark:data-[state=active]:plasmo-text-neutral-50",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "plasmo-mt-2 plasmo-ring-offset-white focus-visible:plasmo-outline-none focus-visible:plasmo-ring-2 focus-visible:plasmo-ring-neutral-950 focus-visible:plasmo-ring-offset-2 dark:plasmo-ring-offset-neutral-950 dark:focus-visible:plasmo-ring-neutral-300",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
