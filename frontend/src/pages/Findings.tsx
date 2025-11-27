import { useState, useEffect, useRef } from 'react'
import {
    Search,
    Plus,
    Shield,
    Smartphone,
    Globe,
    Server,
    Database,
    Cpu,
    FileText,
    Upload
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from '@/lib/utils'
import { vulnerabilityDatabase } from '../data/vulnerabilities'
import { AddFindingDialog } from '@/components/AddFindingDialog'
import { useToast } from "@/components/ui/use-toast"

export default function Findings() {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('All')
    const [selectedSeverity, setSelectedSeverity] = useState<string>('All')
    const [customFindings, setCustomFindings] = useState<any[]>([])
    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { toast } = useToast()

    // Load custom findings from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('customFindings')
        if (saved) {
            try {
                setCustomFindings(JSON.parse(saved))
            } catch (e) {
                console.error('Failed to parse custom findings', e)
            }
        }
    }, [])

    // Combine static and custom findings
    const allFindings = [...customFindings, ...vulnerabilityDatabase]

    // Filter Logic
    const filteredFindings = allFindings.filter(finding => {
        const matchesSearch = finding.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            finding.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            finding.owasp_reference.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = selectedCategory === 'All' || finding.category === selectedCategory
        const matchesSeverity = selectedSeverity === 'All' || finding.severity === selectedSeverity

        return matchesSearch && matchesCategory && matchesSeverity
    })

    // Helper for Severity Colors
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'Critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
            case 'High': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800'
            case 'Medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
            case 'Low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
            default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
        }
    }

    // Helper for Category Icons
    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'Web': return <Globe className="w-4 h-4" />
            case 'Mobile': return <Smartphone className="w-4 h-4" />
            case 'Network': return <Server className="w-4 h-4" />
            case 'Database': return <Database className="w-4 h-4" />
            case 'Cloud': return <Cpu className="w-4 h-4" />
            default: return <Shield className="w-4 h-4" />
        }
    }

    const handleAddFinding = (newFinding: any) => {
        const updatedFindings = [newFinding, ...customFindings]
        setCustomFindings(updatedFindings)
        localStorage.setItem('customFindings', JSON.stringify(updatedFindings))
        toast({
            title: "Finding Added",
            description: "New custom finding has been added to the database.",
        })
    }

    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Mock import for now - in a real app we'd parse XML/CSV here
        // Just simulating a successful import of a dummy finding
        setTimeout(() => {
            const importedFinding = {
                id: `imported-${Date.now()}`,
                title: `Imported: ${file.name.split('.')[0]} Vulnerability`,
                severity: 'High',
                category: 'Network',
                description: 'This finding was imported from an external scanner report.',
                remediation: 'Review the imported data and verify the finding.',
                owasp_reference: 'N/A'
            }

            const updatedFindings = [importedFinding, ...customFindings]
            setCustomFindings(updatedFindings)
            localStorage.setItem('customFindings', JSON.stringify(updatedFindings))

            toast({
                title: "Import Successful",
                description: `Successfully imported findings from ${file.name}`,
            })

            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = ''
        }, 1000)
    }

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Findings Database</h1>
                    <p className="text-muted-foreground">Browse standard vulnerabilities and build your report</p>
                </div>
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".xml,.csv,.json"
                        onChange={handleFileChange}
                    />
                    <Button variant="outline" onClick={handleImportClick}>
                        <Upload className="w-4 h-4 mr-2" />
                        Import Findings
                    </Button>
                    <Button className="bg-primary hover:bg-primary/90" onClick={() => setAddDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Custom Finding
                    </Button>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 flex-shrink-0">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                        placeholder="Search findings..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Categories</SelectItem>
                        <SelectItem value="Web">Web</SelectItem>
                        <SelectItem value="Mobile">Mobile</SelectItem>
                        <SelectItem value="Network">Network</SelectItem>
                        <SelectItem value="Database">Database</SelectItem>
                        <SelectItem value="Cloud">Cloud</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Severities</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Main Content - Single Column */}
            <div className="flex-1 min-h-0">
                <div className="max-w-5xl mx-auto h-full">
                    <ScrollArea className="h-full pr-4">
                        <div className="grid grid-cols-1 gap-4 pb-8">
                            {filteredFindings.map((finding) => (
                                <Card key={finding.id} className="hover:shadow-md transition-all hover:scale-[1.01] cursor-pointer group border-l-4 border-l-transparent hover:border-l-primary">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <CardTitle className="text-lg font-semibold text-foreground">
                                                        {finding.title}
                                                    </CardTitle>
                                                    <Badge variant="outline" className={cn("text-xs font-medium px-2 py-0.5", getSeverityColor(finding.severity))}>
                                                        {finding.severity}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span className="font-mono">{finding.id}</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        {getCategoryIcon(finding.category)}
                                                        {finding.category}
                                                    </span>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <FileText className="w-4 h-4 mr-2" />
                                                View Details
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground line-clamp-3">
                                            {finding.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                            {filteredFindings.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>No findings found matching your criteria.</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
            {/* Add Finding Dialog */}
            <AddFindingDialog
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
                onFindingAdded={handleAddFinding}
            />
        </div>
    )
}
