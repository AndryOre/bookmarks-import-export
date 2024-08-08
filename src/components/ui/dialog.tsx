import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import * as React from "react"

import { cn } from "~common/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "plasmo-fixed plasmo-inset-0 plasmo-z-50 plasmo-bg-black/80 plasmo- data-[state=open]:plasmo-animate-in data-[state=closed]:plasmo-animate-out data-[state=closed]:plasmo-fade-out-0 data-[state=open]:plasmo-fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "plasmo-fixed plasmo-left-[50%] plasmo-top-[50%] plasmo-z-50 plasmo-grid plasmo-w-full plasmo-max-w-lg plasmo-translate-x-[-50%] plasmo-translate-y-[-50%] plasmo-gap-4 plasmo-border plasmo-bg-background plasmo-p-6 plasmo-shadow-lg plasmo-duration-200 data-[state=open]:plasmo-animate-in data-[state=closed]:plasmo-animate-out data-[state=closed]:plasmo-fade-out-0 data-[state=open]:plasmo-fade-in-0 data-[state=closed]:plasmo-zoom-out-95 data-[state=open]:plasmo-zoom-in-95 data-[state=closed]:plasmo-slide-out-to-left-1/2 data-[state=closed]:plasmo-slide-out-to-top-[48%] data-[state=open]:plasmo-slide-in-from-left-1/2 data-[state=open]:plasmo-slide-in-from-top-[48%] sm:plasmo-rounded-lg",
        className
      )}
      {...props}>
      {children}
      <DialogPrimitive.Close className="plasmo-absolute plasmo-right-4 plasmo-top-4 plasmo-rounded-sm plasmo-opacity-70 plasmo-ring-offset-background plasmo-transition-opacity hover:plasmo-opacity-100 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-ring focus:plasmo-ring-offset-2 disabled:plasmo-pointer-events-none data-[state=open]:plasmo-bg-accent data-[state=open]:plasmo-text-muted-foreground">
        <X className="plasmo-h-4 plasmo-w-4" />
        <span className="plasmo-sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "plasmo-flex plasmo-flex-col plasmo-space-y-1.5 plasmo-text-center sm:plasmo-text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "plasmo-flex plasmo-flex-col-reverse sm:plasmo-flex-row sm:plasmo-justify-end sm:plasmo-space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "plasmo-text-lg plasmo-font-semibold plasmo-leading-none plasmo-tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("plasmo-text-sm plasmo-text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
}
