import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
    icon: React.ReactNode
    label: string
    value: number
    trend?: string
    trendUp?: boolean
    badge?: number
    badgeLabel?: string
    variant?: 'default' | 'warning' | 'destructive' | 'success'
}

export function StatCard({
    icon,
    label,
    value,
    trend,
    trendUp,
    badge,
    badgeLabel,
    variant = 'default'
}: StatCardProps) {

    const getVariantStyles = () => {
        switch (variant) {
            case 'destructive':
                return {
                    iconBg: 'bg-red-500/10 dark:bg-red-500/20',
                    iconColor: 'text-red-500',
                    iconBorder: 'border-red-500/20',
                }
            case 'warning':
                return {
                    iconBg: 'bg-orange-500/10 dark:bg-orange-500/20',
                    iconColor: 'text-orange-500',
                    iconBorder: 'border-orange-500/20',
                }
            case 'success':
                return {
                    iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
                    iconColor: 'text-emerald-500',
                    iconBorder: 'border-emerald-500/20',
                }
            case 'default':
            default:
                return {
                    iconBg: 'bg-muted',
                    iconColor: 'text-primary',
                    iconBorder: 'border-border',
                }
        }
    }

    const styles = getVariantStyles()

    return (
        <Card
            className={cn(
                "relative overflow-hidden",
                "bg-card/50 backdrop-blur-sm",
                "transition-all duration-200 hover:border-primary/50",
                "border"
            )}
        >
            <CardContent className="p-6">
                {/* Top Section: Icon and Trend/Badge */}
                <div className="flex items-start justify-between mb-4">
                    {/* Icon */}
                    <div className={cn("p-2 rounded-lg border", styles.iconBg, styles.iconBorder, styles.iconColor)}>
                        {icon}
                    </div>

                    {/* Trend or Badge */}
                    {trend && (
                        <div
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-transparent",
                                trendUp
                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                    : "bg-red-500/10 text-red-500 border-red-500/20"
                            )}
                        >
                            {trendUp ? (
                                <TrendingUp className="w-3.5 h-3.5" />
                            ) : (
                                <TrendingDown className="w-3.5 h-3.5" />
                            )}
                            {trend}
                        </div>
                    )}

                    {badge !== undefined && badge > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">
                            {badge} {badgeLabel}
                        </div>
                    )}
                </div>

                {/* Bottom Section: Value and Label */}
                <div>
                    <h3 className="text-3xl font-bold tracking-tight text-foreground mb-1">
                        {value}
                    </h3>
                    <p className="text-sm font-medium text-muted-foreground">
                        {label}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
