import * as React from "react"

import { cn } from "~lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "plasmo-flex plasmo-h-10 plasmo-w-full plasmo-rounded-md plasmo-border plasmo-border-neutral-200 plasmo-bg-white plasmo-px-3 plasmo-py-2 plasmo-text-sm plasmo-ring-offset-white file:plasmo-border-0 file:plasmo-bg-transparent file:plasmo-text-sm file:plasmo-font-medium placeholder:plasmo-text-neutral-500 focus-visible:plasmo-outline-none focus-visible:plasmo-ring-2 focus-visible:plasmo-ring-neutral-950 focus-visible:plasmo-ring-offset-2 disabled:plasmo-cursor-not-allowed disabled:plasmo-opacity-50 dark:plasmo-border-neutral-800 dark:plasmo-bg-neutral-950 dark:plasmo-ring-offset-neutral-950 dark:placeholder:plasmo-text-neutral-400 dark:focus-visible:plasmo-ring-neutral-300",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
