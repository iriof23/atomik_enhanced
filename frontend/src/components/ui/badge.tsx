import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
                secondary:
                    "border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive:
                    "border border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
                outline: 
                    "border border-border text-foreground",
                success:
                    "border border-transparent bg-green-500 text-white hover:bg-green-500/80",
                // Severity variants - Premium solid colors with white text
                critical:
                    "border-0 bg-gradient-to-r from-red-600 to-red-700 text-white shadow-sm",
                high:
                    "border-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm",
                medium:
                    "border-0 bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm",
                low:
                    "border-0 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm",
                info:
                    "border-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm",
                // Status variants - Subtle but solid
                planning:
                    "border-0 bg-slate-200 text-slate-700 shadow-sm",
                in_progress:
                    "border-0 bg-slate-800 text-white shadow-sm",
                review:
                    "border-0 bg-blue-600 text-white shadow-sm",
                completed:
                    "border-0 bg-emerald-600 text-white shadow-sm",
                on_hold:
                    "border-0 bg-amber-600 text-white shadow-sm",
                cancelled:
                    "border-0 bg-slate-500 text-white shadow-sm",
                // Priority variants - Solid colors
                urgent:
                    "border-0 bg-gradient-to-r from-red-600 to-red-700 text-white shadow-sm",
                normal:
                    "border-0 bg-slate-600 text-white shadow-sm",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
