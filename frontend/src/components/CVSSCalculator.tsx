import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calculator } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CVSSCalculatorProps {
    vector: string
    onUpdate: (vector: string, score: number) => void
}

// CVSS 3.1 Metrics
const METRICS = {
    AV: { name: 'Attack Vector', options: { N: 'Network', A: 'Adjacent', L: 'Local', P: 'Physical' } },
    AC: { name: 'Attack Complexity', options: { L: 'Low', H: 'High' } },
    PR: { name: 'Privileges Required', options: { N: 'None', L: 'Low', H: 'High' } },
    UI: { name: 'User Interaction', options: { N: 'None', R: 'Required' } },
    S: { name: 'Scope', options: { U: 'Unchanged', C: 'Changed' } },
    C: { name: 'Confidentiality', options: { N: 'None', L: 'Low', H: 'High' } },
    I: { name: 'Integrity', options: { N: 'None', L: 'Low', H: 'High' } },
    A: { name: 'Availability', options: { N: 'None', L: 'Low', H: 'High' } }
}

export default function CVSSCalculator({ vector, onUpdate }: CVSSCalculatorProps) {
    const [metrics, setMetrics] = useState<Record<string, string>>({})
    const [score, setScore] = useState(0)

    const calculateScore = (currentMetrics: Record<string, string>) => {
        // This is a simplified calculation for demo purposes
        // In a real app, use a proper CVSS library like 'cvss'

        // Mock calculation logic to show responsiveness
        let baseScore = 0
        const impact =
            (currentMetrics.C === 'H' ? 0.56 : currentMetrics.C === 'L' ? 0.22 : 0) +
            (currentMetrics.I === 'H' ? 0.56 : currentMetrics.I === 'L' ? 0.22 : 0) +
            (currentMetrics.A === 'H' ? 0.56 : currentMetrics.A === 'L' ? 0.22 : 0)

        const exploitability =
            (currentMetrics.AV === 'N' ? 0.85 : currentMetrics.AV === 'A' ? 0.62 : currentMetrics.AV === 'L' ? 0.55 : 0.2) *
            (currentMetrics.AC === 'L' ? 0.77 : 0.44) *
            (currentMetrics.PR === 'N' ? 0.85 : currentMetrics.PR === 'L' ? 0.62 : 0.27) *
            (currentMetrics.UI === 'N' ? 0.85 : 0.62)

        if (impact > 0) {
            baseScore = Math.min(10, (impact + exploitability) * 3) // Mock formula
        }

        // Round to 1 decimal
        const finalScore = Math.round(baseScore * 10) / 10
        setScore(finalScore)
    }

    // Parse vector string on init
    useEffect(() => {
        if (vector && vector.startsWith('CVSS:3.1/')) {
            const parts = vector.replace('CVSS:3.1/', '').split('/')
            const newMetrics: Record<string, string> = {}
            parts.forEach(part => {
                const [key, value] = part.split(':')
                if (key && value) newMetrics[key] = value
            })
            setMetrics(newMetrics)
            calculateScore(newMetrics)
        } else {
            // Default values
            const defaults = { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'N', I: 'N', A: 'N' }
            setMetrics(defaults)
            calculateScore(defaults)
        }
    }, [vector])

    const updateMetric = (key: string, value: string) => {
        const newMetrics = { ...metrics, [key]: value }
        setMetrics(newMetrics)
        calculateScore(newMetrics)

        // Construct vector string
        const vectorString = `CVSS:3.1/${Object.entries(newMetrics).map(([k, v]) => `${k}:${v}`).join('/')}`
        onUpdate(vectorString, score)
    }

    const getSeverityColor = (s: number) => {
        if (s >= 9.0) return 'text-white bg-gradient-to-r from-red-600 to-red-700 shadow-sm'
        if (s >= 7.0) return 'text-white bg-gradient-to-r from-orange-500 to-orange-600 shadow-sm'
        if (s >= 4.0) return 'text-white bg-gradient-to-r from-amber-500 to-amber-600 shadow-sm'
        return 'text-white bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-sm'
    }

    const getSeverityLabel = (s: number) => {
        if (s >= 9.0) return 'Critical'
        if (s >= 7.0) return 'High'
        if (s >= 4.0) return 'Medium'
        return 'Low'
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                    <Calculator className="w-4 h-4 mr-2" />
                    <span className={cn("font-bold mr-2 px-1.5 py-0.5 rounded text-xs", getSeverityColor(score))}>
                        {score.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:inline-block truncate max-w-[150px]">
                        {vector || 'CVSS:3.1/...'}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-4" align="start">
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h4 className="font-semibold">CVSS v3.1 Calculator</h4>
                        <div className={cn("px-2 py-1 rounded text-sm font-bold", getSeverityColor(score))}>
                            {score.toFixed(1)} {getSeverityLabel(score)}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {Object.entries(METRICS).map(([key, { name, options }]) => (
                            <div key={key} className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">{name} ({key})</Label>
                                <div className="flex flex-wrap gap-1">
                                    {Object.entries(options).map(([optKey, optLabel]) => (
                                        <button
                                            key={optKey}
                                            onClick={() => updateMetric(key, optKey)}
                                            className={cn(
                                                "px-2 py-1 text-[10px] rounded border transition-colors",
                                                metrics[key] === optKey
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "bg-background hover:bg-muted text-muted-foreground border-input"
                                            )}
                                            title={optLabel}
                                        >
                                            {optKey}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
