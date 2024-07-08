import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "~lib/utils"

const buttonVariants = cva(
  "plasmo-inline-flex plasmo-items-center plasmo-justify-center plasmo-whitespace-nowrap plasmo-rounded-md plasmo-text-sm plasmo-font-medium plasmo-ring-offset-white plasmo-transition-colors focus-visible:plasmo-outline-none focus-visible:plasmo-ring-2 focus-visible:plasmo-ring-neutral-950 focus-visible:plasmo-ring-offset-2 disabled:plasmo-pointer-events-none disabled:plasmo-opacity-50 dark:plasmo-ring-offset-neutral-950 dark:focus-visible:plasmo-ring-neutral-300",
  {
    variants: {
      variant: {
        default:
          "plasmo-bg-neutral-900 plasmo-text-neutral-50 hover:plasmo-bg-neutral-900/90 dark:plasmo-bg-neutral-50 dark:plasmo-text-neutral-900 dark:hover:plasmo-bg-neutral-50/90",
        destructive:
          "plasmo-bg-red-500 plasmo-text-neutral-50 hover:plasmo-bg-red-500/90 dark:plasmo-bg-red-900 dark:plasmo-text-neutral-50 dark:hover:plasmo-bg-red-900/90",
        outline:
          "plasmo-border plasmo-border-neutral-200 plasmo-bg-white hover:plasmo-bg-neutral-100 hover:plasmo-text-neutral-900 dark:plasmo-border-neutral-800 dark:plasmo-bg-neutral-950 dark:hover:plasmo-bg-neutral-800 dark:hover:plasmo-text-neutral-50",
        secondary:
          "plasmo-bg-neutral-100 plasmo-text-neutral-900 hover:plasmo-bg-neutral-100/80 dark:plasmo-bg-neutral-800 dark:plasmo-text-neutral-50 dark:hover:plasmo-bg-neutral-800/80",
        ghost:
          "hover:plasmo-bg-neutral-100 hover:plasmo-text-neutral-900 dark:hover:plasmo-bg-neutral-800 dark:hover:plasmo-text-neutral-50",
        link: "plasmo-text-neutral-900 plasmo-underline-offset-4 hover:plasmo-underline dark:plasmo-text-neutral-50"
      },
      size: {
        default: "plasmo-h-10 plasmo-px-4 plasmo-py-2",
        sm: "plasmo-h-9 plasmo-rounded-md plasmo-px-3",
        lg: "plasmo-h-11 plasmo-rounded-md plasmo-px-8",
        icon: "plasmo-h-10 plasmo-w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
