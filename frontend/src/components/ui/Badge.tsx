import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:     'border-transparent bg-primary text-primary-foreground',
        secondary:   'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline:     'text-foreground border-border',
        success:     'border-transparent bg-income-subtle text-income',
        warning:     'border-transparent bg-[hsl(var(--warning)/0.10)] text-warning',
        info:        'border-transparent bg-primary/10 text-primary',
      },
    },
    defaultVariants: { variant: 'secondary' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Legacy: hex color for inline style (TransactionTable usage) */
  color?: string
}

export function Badge({ className, variant, color, children, ...props }: BadgeProps) {
  // Legacy color-based usage
  if (color) {
    return (
      <span
        className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', className)}
        style={{ backgroundColor: `${color}20`, color }}
        {...(props as React.HTMLAttributes<HTMLSpanElement>)}
      >
        {children}
      </span>
    )
  }
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </div>
  )
}

export { badgeVariants }
