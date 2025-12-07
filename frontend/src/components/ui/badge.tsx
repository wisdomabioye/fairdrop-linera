import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm [a&]:hover:bg-primary/90 [a&]:hover:shadow-md",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white shadow-sm [a&]:hover:bg-destructive/90 [a&]:hover:shadow-md focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "text-foreground border-border [a&]:hover:bg-secondary [a&]:hover:border-primary/20",
        success:
          "border-transparent bg-success text-white shadow-sm [a&]:hover:bg-success/90 [a&]:hover:shadow-md",
        warning:
          "border-transparent bg-warning text-white shadow-sm [a&]:hover:bg-warning/90 [a&]:hover:shadow-md",
        info:
          "border-transparent bg-info text-white shadow-sm [a&]:hover:bg-info/90 [a&]:hover:shadow-md",
        active:
          "border-transparent gradient-auction-active text-white shadow-sm [a&]:hover:shadow-md",
        ending:
          "border-transparent gradient-auction-ending text-white shadow-sm [a&]:hover:shadow-md animate-pulse-subtle",
        winning:
          "border-transparent gradient-auction-winning text-white shadow-sm [a&]:hover:shadow-md",
        outbid:
          "border-transparent gradient-auction-outbid text-white shadow-sm [a&]:hover:shadow-md",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
