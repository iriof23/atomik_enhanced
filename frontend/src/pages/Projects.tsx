import { useState, useEffect } from 'react'
import {
    FolderKanban,
    Users,
    Clock,
    CheckCircle2,
    AlertCircle,
    Calendar,
    LayoutGrid,
    List,
    Table2,
    Plus,
    Search,
    Filter,
    Download,
    TrendingUp,
    TrendingDown,
    Building2,
    Target,
    PlayCircle,
    PauseCircle,
    XCircle,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    FileText,
    Shield,
    ChevronRight,
    X
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { AddProjectDialog } from '@/components/AddProjectDialog'
import { cn } from '@/lib/utils'
import {
    differenceInDays,
    startOfMonth,
    endOfMonth,
    addMonths,
    format,
    isSameMonth,
    isWithinInterval,
    startOfDay
} from 'date-fns'

// Project interface
interface Project {
    id: string
    name: string
    clientId: string
    clientName: string
    clientLogoUrl?: string

    // Project details
    type: 'External' | 'Internal' | 'Web App' | 'Mobile' | 'API' | 'Cloud' | 'Network'
    status: 'Planning' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled'
    priority: 'Critical' | 'High' | 'Medium' | 'Low'

    // Timeline
    startDate: Date
    endDate: Date
    progress: number // 0-100

    // Scope
    scope: string[]
    methodology: string // e.g., "OWASP", "PTES", "NIST"

    // Team
    teamMembers: {
        id: string
        name: string
        role: string
        avatarUrl?: string
    }[]
    leadTester: string

    // Metrics
    findingsCount: number
    findingsBySeverity: {
        critical: number
        high: number
        medium: number
        low: number
    }

    // Compliance
    complianceFrameworks: string[] // e.g., ["PCI-DSS", "SOC2"]

    // Metadata
    description: string
    lastActivity: string
    lastActivityDate: Date
    createdAt: Date
    updatedAt: Date
}

// Mock data
const mockProjects: Project[] = [
    {
        id: '1',
        name: 'Q1 2024 External Penetration Test',
        clientId: '1',
        clientName: 'Acme Corporation',
        clientLogoUrl: '🏢',
        type: 'External',
        status: 'In Progress',
        priority: 'Critical',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-02-28'),
        progress: 65,
        scope: ['acme.com', '*.acme.com', '203.0.113.0/24'],
        methodology: 'PTES',
        teamMembers: [
            { id: '1', name: 'Alice Johnson', role: 'Lead Pentester', avatarUrl: '' },
            { id: '2', name: 'Bob Smith', role: 'Security Analyst', avatarUrl: '' },
            { id: '3', name: 'Carol White', role: 'Junior Tester', avatarUrl: '' }
        ],
        leadTester: 'Alice Johnson',
        findingsCount: 23,
        findingsBySeverity: { critical: 3, high: 7, medium: 10, low: 3 },
        complianceFrameworks: ['PCI-DSS', 'SOC2'],
        description: 'Comprehensive external penetration test covering all internet-facing assets',
        lastActivity: '2 hours ago',
        lastActivityDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date()
    },
    {
        id: '2',
        name: 'Mobile App Security Assessment',
        clientId: '2',
        clientName: 'TechStart Inc',
        clientLogoUrl: '🚀',
        type: 'Mobile',
        status: 'Planning',
        priority: 'High',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-15'),
        progress: 15,
        scope: ['iOS App', 'Android App', 'API Backend'],
        methodology: 'OWASP MASVS',
        teamMembers: [
            { id: '4', name: 'David Lee', role: 'Mobile Security Expert', avatarUrl: '' },
            { id: '5', name: 'Emma Davis', role: 'API Tester', avatarUrl: '' }
        ],
        leadTester: 'David Lee',
        findingsCount: 2,
        findingsBySeverity: { critical: 0, high: 1, medium: 1, low: 0 },
        complianceFrameworks: ['OWASP'],
        description: 'Security assessment of mobile banking application',
        lastActivity: '1 day ago',
        lastActivityDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        createdAt: new Date('2024-01-25'),
        updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    },
    {
        id: '3',
        name: 'Annual Infrastructure Audit',
        clientId: '3',
        clientName: 'Global Finance Ltd',
        clientLogoUrl: '🏦',
        type: 'Internal',
        status: 'Completed',
        priority: 'Critical',
        startDate: new Date('2023-11-01'),
        endDate: new Date('2023-12-15'),
        progress: 100,
        scope: ['Internal Network', 'Active Directory', 'Database Servers'],
        methodology: 'NIST',
        teamMembers: [
            { id: '1', name: 'Alice Johnson', role: 'Lead Pentester', avatarUrl: '' },
            { id: '6', name: 'Frank Miller', role: 'Network Specialist', avatarUrl: '' },
            { id: '7', name: 'Grace Chen', role: 'Security Analyst', avatarUrl: '' }
        ],
        leadTester: 'Alice Johnson',
        findingsCount: 45,
        findingsBySeverity: { critical: 5, high: 12, medium: 18, low: 10 },
        complianceFrameworks: ['PCI-DSS', 'GDPR', 'SOC2'],
        description: 'Comprehensive internal network and infrastructure security audit',
        lastActivity: '2 months ago',
        lastActivityDate: new Date('2023-12-15'),
        createdAt: new Date('2023-10-20'),
        updatedAt: new Date('2023-12-15')
    },
    {
        id: '4',
        name: 'Cloud Security Review - AWS',
        clientId: '1',
        clientName: 'Acme Corporation',
        clientLogoUrl: '🏢',
        type: 'Cloud',
        status: 'In Progress',
        priority: 'High',
        startDate: new Date('2024-01-20'),
        endDate: new Date('2024-02-10'),
        progress: 40,
        scope: ['AWS Infrastructure', 'S3 Buckets', 'IAM Policies', 'EC2 Instances'],
        methodology: 'CIS Benchmarks',
        teamMembers: [
            { id: '8', name: 'Henry Wilson', role: 'Cloud Security Expert', avatarUrl: '' },
            { id: '2', name: 'Bob Smith', role: 'Security Analyst', avatarUrl: '' }
        ],
        leadTester: 'Henry Wilson',
        findingsCount: 18,
        findingsBySeverity: { critical: 2, high: 5, medium: 8, low: 3 },
        complianceFrameworks: ['AWS Well-Architected', 'SOC2'],
        description: 'Security review of AWS cloud infrastructure and configurations',
        lastActivity: '5 hours ago',
        lastActivityDate: new Date(Date.now() - 5 * 60 * 60 * 1000),
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date()
    },
    {
        id: '5',
        name: 'Web Application Pentest',
        clientId: '2',
        clientName: 'TechStart Inc',
        clientLogoUrl: '🚀',
        type: 'Web App',
        status: 'On Hold',
        priority: 'Medium',
        startDate: new Date('2024-01-10'),
        endDate: new Date('2024-01-25'),
        progress: 30,
        scope: ['app.techstart.io', 'admin.techstart.io', 'API endpoints'],
        methodology: 'OWASP Top 10',
        teamMembers: [
            { id: '9', name: 'Ivy Taylor', role: 'Web App Specialist', avatarUrl: '' }
        ],
        leadTester: 'Ivy Taylor',
        findingsCount: 8,
        findingsBySeverity: { critical: 1, high: 2, medium: 4, low: 1 },
        complianceFrameworks: ['OWASP'],
        description: 'Penetration testing of customer portal and admin interface',
        lastActivity: '1 week ago',
        lastActivityDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    },
    {
        id: '6',
        name: 'API Security Assessment',
        clientId: '4',
        clientName: 'HealthTech Solutions',
        clientLogoUrl: '🏥',
        type: 'API',
        status: 'Planning',
        priority: 'High',
        startDate: new Date('2024-02-05'),
        endDate: new Date('2024-02-20'),
        progress: 10,
        scope: ['REST API', 'GraphQL API', 'WebSocket endpoints'],
        methodology: 'OWASP API Security',
        teamMembers: [
            { id: '5', name: 'Emma Davis', role: 'API Tester', avatarUrl: '' },
            { id: '10', name: 'Jack Brown', role: 'Security Analyst', avatarUrl: '' }
        ],
        leadTester: 'Emma Davis',
        findingsCount: 0,
        findingsBySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
        complianceFrameworks: ['HIPAA', 'OWASP'],
        description: 'Comprehensive API security testing for healthcare platform',
        lastActivity: '3 days ago',
        lastActivityDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        createdAt: new Date('2024-01-28'),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    },
    {
        id: '7',
        name: 'Network Infrastructure Test',
        clientId: '5',
        clientName: 'RetailCo International',
        clientLogoUrl: '🛒',
        type: 'Network',
        status: 'Completed',
        priority: 'Medium',
        startDate: new Date('2023-12-01'),
        endDate: new Date('2023-12-20'),
        progress: 100,
        scope: ['Corporate Network', 'VPN', 'Firewall Rules', 'WiFi Security'],
        methodology: 'PTES',
        teamMembers: [
            { id: '6', name: 'Frank Miller', role: 'Network Specialist', avatarUrl: '' },
            { id: '3', name: 'Carol White', role: 'Junior Tester', avatarUrl: '' }
        ],
        leadTester: 'Frank Miller',
        findingsCount: 12,
        findingsBySeverity: { critical: 0, high: 3, medium: 6, low: 3 },
        complianceFrameworks: ['PCI-DSS'],
        description: 'Network security assessment of retail infrastructure',
        lastActivity: '1 month ago',
        lastActivityDate: new Date('2023-12-20'),
        createdAt: new Date('2023-11-25'),
        updatedAt: new Date('2023-12-20')
    }
]

// Mock clients for dropdown
const mockClientsForDropdown = [
    { id: '1', name: 'Acme Corporation', logoUrl: '🏢' },
    { id: '2', name: 'TechStart Inc', logoUrl: '🚀' },
    { id: '3', name: 'Global Finance Ltd', logoUrl: '🏦' },
    { id: '4', name: 'HealthTech Solutions', logoUrl: '🏥' },
    { id: '5', name: 'RetailCo International', logoUrl: '🛒' }
]

type ViewMode = 'card' | 'table' | 'timeline'

const getStatusColor = (status: Project['status']) => {
    switch (status) {
        case 'In Progress': return 'bg-blue-500 hover:bg-blue-600'
        case 'Planning': return 'bg-purple-500 hover:bg-purple-600'
        case 'On Hold': return 'bg-yellow-500 hover:bg-yellow-600 text-black'
        case 'Completed': return 'bg-green-500 hover:bg-green-600'
        case 'Cancelled': return 'bg-gray-500 hover:bg-gray-600'
    }
}

const getPriorityColor = (priority: Project['priority']) => {
    switch (priority) {
        case 'Critical': return 'border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
        case 'High': return 'border-orange-500 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
        case 'Medium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300'
        case 'Low': return 'border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
    }
}

export default function Projects() {
    const [viewMode, setViewMode] = useState<ViewMode>('card')
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [activeFilters, setActiveFilters] = useState<Array<{ id: string, label: string, value: string }>>([])
    const [projects, setProjects] = useState(mockProjects)
    const [addProjectDialogOpen, setAddProjectDialogOpen] = useState(false)

    // Load saved view mode from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('projectsViewMode')
        if (saved && (saved === 'card' || saved === 'table' || saved === 'timeline')) {
            setViewMode(saved)
        }
    }, [])

    // Save view mode to localStorage
    useEffect(() => {
        localStorage.setItem('projectsViewMode', viewMode)
    }, [viewMode])

    // Filter management functions
    const removeFilter = (id: string) => {
        setActiveFilters(activeFilters.filter(f => f.id !== id))
    }

    const clearAllFilters = () => {
        setActiveFilters([])
        setSearchQuery('')
    }

    const clearSearch = () => {
        setSearchQuery('')
    }

    const openFilterDialog = () => {
        console.log('Open filter dialog')
    }

    const openAddProjectDialog = () => {
        setAddProjectDialogOpen(true)
    }

    const handleProjectAdded = (newProject: any) => {
        setProjects([...projects, newProject])
        console.log('New project added:', newProject)
    }

    // Calculate stats
    const stats = {
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'In Progress').length,
        completedProjects: projects.filter(p => p.status === 'Completed').length,
        overdueProjects: projects.filter(p => p.endDate < new Date() && p.status !== 'Completed').length,
        totalFindings: projects.reduce((sum, p) => sum + p.findingsCount, 0),
        criticalFindings: projects.reduce((sum, p) => sum + p.findingsBySeverity.critical, 0)
    }

    // Filter projects based on search
    const filteredProjects = projects.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.methodology.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.complianceFrameworks.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Projects</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Manage penetration testing projects and track progress
                    </p>
                </div>
                <Button onClick={openAddProjectDialog} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={<FolderKanban className="w-6 h-6" />}
                    label="Total Projects"
                    value={stats.totalProjects}
                    trend="+15%"
                    trendUp={true}
                    color="blue"
                />
                <StatCard
                    icon={<PlayCircle className="w-6 h-6" />}
                    label="Active Projects"
                    value={stats.activeProjects}
                    trend="+8%"
                    trendUp={true}
                    color="green"
                />
                <StatCard
                    icon={<CheckCircle2 className="w-6 h-6" />}
                    label="Completed"
                    value={stats.completedProjects}
                    trend="+12%"
                    trendUp={true}
                    color="purple"
                />
                <StatCard
                    icon={<AlertCircle className="w-6 h-6" />}
                    label="Critical Findings"
                    value={stats.criticalFindings}
                    badge={stats.overdueProjects}
                    badgeLabel="Overdue"
                    color="red"
                />
            </div>

            {/* Toolbar */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex-1 w-full sm:w-auto">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search projects by name, client, type, or compliance..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={activeFilters.length > 0 ? "default" : "outline"}
                            size="sm"
                            onClick={openFilterDialog}
                            className="relative"
                        >
                            <Filter className="h-4 w-4 mr-2" />
                            Filter
                            {activeFilters.length > 0 && (
                                <Badge
                                    variant="secondary"
                                    className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-primary-foreground text-primary font-bold"
                                >
                                    {activeFilters.length}
                                </Badge>
                            )}
                        </Button>

                        <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Download className="w-4 h-4" />
                            Export
                        </button>

                        {/* View Mode Switcher with Tooltips */}
                        <TooltipProvider>
                            <div className="flex items-center gap-1 border rounded-md p-1 border-gray-300 dark:border-gray-600">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={viewMode === 'card' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setViewMode('card')}
                                            className="h-8 w-8 p-0"
                                        >
                                            <LayoutGrid className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Card View</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={viewMode === 'table' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setViewMode('table')}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Table2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Table View</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setViewMode('timeline')}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Calendar className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Timeline View</TooltipContent>
                                </Tooltip>
                            </div>
                        </TooltipProvider>
                    </div>
                </div>

                {/* Active Filters Display */}
                {activeFilters.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-center p-3 bg-muted/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
                        {activeFilters.map((filter) => (
                            <Badge
                                key={filter.id}
                                variant="secondary"
                                className="gap-1.5 pl-2 pr-1 py-1 hover:bg-secondary/80"
                            >
                                {filter.label}: {filter.value}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 hover:bg-transparent"
                                    onClick={() => removeFilter(filter.id)}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </Badge>
                        ))}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllFilters}
                            className="text-xs h-7"
                        >
                            Clear all
                        </Button>
                    </div>
                )}
            </div>

            {/* Loading Skeletons */}
            {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="p-6 border rounded-lg border-gray-200 dark:border-gray-700">
                            <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                    <Skeleton className="h-6 w-48" />
                                    <Skeleton className="h-5 w-20" />
                                </div>
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-2 w-full" />
                                <div className="flex gap-2">
                                    <Skeleton className="h-6 w-6 rounded-full" />
                                    <Skeleton className="h-6 w-6 rounded-full" />
                                    <Skeleton className="h-6 w-6 rounded-full" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Content Views */}
            {!isLoading && filteredProjects.length > 0 && (
                <>
                    {viewMode === 'card' && <CardView projects={filteredProjects} />}
                    {viewMode === 'table' && <TableView projects={filteredProjects} />}
                    {viewMode === 'timeline' && <TimelineView projects={filteredProjects} />}
                </>
            )}

            {/* Empty State: No projects exist */}
            {!isLoading && projects.length === 0 && !searchQuery && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <FolderKanban className="h-16 w-16 text-muted-foreground mb-4 animate-pulse" />
                    <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-sm">
                        Get started by creating your first penetration testing project
                    </p>
                    <Button onClick={openAddProjectDialog} size="lg">
                        <Plus className="h-5 w-5 mr-2" />
                        Create Your First Project
                    </Button>
                </div>
            )}

            {/* Empty State: No search results */}
            {!isLoading && filteredProjects.length === 0 && searchQuery && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Search className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No projects found</h3>
                    <p className="text-muted-foreground mb-6 max-w-sm">
                        No projects match your search "{searchQuery}". Try adjusting your filters or search terms.
                    </p>
                    <Button variant="outline" onClick={clearSearch}>
                        <X className="h-4 w-4 mr-2" />
                        Clear Search
                    </Button>
                </div>
            )}

            <AddProjectDialog
                open={addProjectDialogOpen}
                onOpenChange={setAddProjectDialogOpen}
                onProjectAdded={handleProjectAdded}
                clients={mockClientsForDropdown}
            />
        </div>
    )
}

// Stats Card Component (reused from Clients)
function StatCard({
    icon,
    label,
    value,
    trend,
    trendUp,
    badge,
    badgeLabel,
    color
}: {
    icon: React.ReactNode
    label: string
    value: number
    trend?: string
    trendUp?: boolean
    badge?: number
    badgeLabel?: string
    color: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}) {
    const colorClasses = {
        blue: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
        green: 'bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400',
        yellow: 'bg-yellow-50 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400',
        red: 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400',
        purple: 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
    }

    return (
        <Card className={cn('border-l-4', {
            'border-l-blue-600': color === 'blue',
            'border-l-green-600': color === 'green',
            'border-l-yellow-600': color === 'yellow',
            'border-l-red-600': color === 'red',
            'border-l-purple-600': color === 'purple'
        })}>
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div className={cn('p-3 rounded-lg', colorClasses[color])}>
                        {icon}
                    </div>
                    {trend && (
                        <Badge variant="secondary" className="gap-1">
                            {trendUp ? (
                                <TrendingUp className="w-3 h-3 text-green-600" />
                            ) : (
                                <TrendingDown className="w-3 h-3 text-red-600" />
                            )}
                            {trend}
                        </Badge>
                    )}
                </div>
                <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{value}</h3>
                        {badge !== undefined && badge > 0 && (
                            <Badge variant="destructive" className="text-xs">
                                {badge} {badgeLabel}
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{label}</p>
                </div>
            </CardContent>
        </Card>
    )
}

// Card View Component
function CardView({ projects }: { projects: Project[] }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
            ))}
        </div>
    )
}

// Project Card Component
function ProjectCard({ project }: { project: Project }) {


    return (
        <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                        <div className="text-2xl">{project.clientLogoUrl}</div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                {project.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                                <Building2 className="w-3 h-3" />
                                {project.clientName}
                            </p>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Project
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                Generate Report
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Project
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Status and Priority */}
                <div className="flex gap-2 mb-4">
                    <Badge className={cn('text-xs font-medium', getStatusColor(project.status))}>
                        {project.status}
                    </Badge>
                    <Badge variant="outline" className={cn('text-xs font-medium border-2', getPriorityColor(project.priority))}>
                        {project.priority}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                        {project.type}
                    </Badge>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-400">Progress</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${project.progress}%` }}
                        />
                    </div>
                </div>

                {/* Timeline */}
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <Calendar className="w-4 h-4" />
                    <span>{project.startDate.toLocaleDateString()} - {project.endDate.toLocaleDateString()}</span>
                </div>

                {/* Team Members */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex -space-x-2">
                        {project.teamMembers.slice(0, 3).map((member, idx) => (
                            <Avatar key={member.id} className="h-8 w-8 border-2 border-white dark:border-gray-800">
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                                    {member.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                            </Avatar>
                        ))}
                        {project.teamMembers.length > 3 && (
                            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium">
                                +{project.teamMembers.length - 3}
                            </div>
                        )}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        Lead: {project.leadTester}
                    </span>
                </div>

                {/* Findings Summary */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm">
                        <Target className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="font-semibold text-gray-900 dark:text-white">{project.findingsCount}</span>
                        <span className="text-gray-600 dark:text-gray-400">Findings</span>
                    </div>
                    <div className="flex gap-1">
                        {project.findingsBySeverity.critical > 0 && (
                            <Badge variant="destructive" className="text-xs px-1.5 py-0">
                                {project.findingsBySeverity.critical} C
                            </Badge>
                        )}
                        {project.findingsBySeverity.high > 0 && (
                            <Badge className="text-xs px-1.5 py-0 bg-orange-500 hover:bg-orange-600">
                                {project.findingsBySeverity.high} H
                            </Badge>
                        )}
                        {project.findingsBySeverity.medium > 0 && (
                            <Badge className="text-xs px-1.5 py-0 bg-yellow-500 hover:bg-yellow-600 text-black">
                                {project.findingsBySeverity.medium} M
                            </Badge>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

// Table View Component
function TableView({ projects }: { projects: Project[] }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Project
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Client
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Priority
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Progress
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Timeline
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Team
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {projects.map((project) => (
                            <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-medium text-gray-900 dark:text-white">{project.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{project.type}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{project.clientLogo}</span>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{project.clientName}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Badge className={cn('text-xs font-medium', getStatusColor(project.status))}>
                                        {project.status}
                                    </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Badge variant="outline" className={cn('text-xs font-medium border-2', getPriorityColor(project.priority))}>
                                        {project.priority}
                                    </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap align-middle">
                                    <div className="w-24">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-gray-500">{project.progress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                            <div
                                                className="bg-blue-600 h-1.5 rounded-full"
                                                style={{ width: `${project.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col">
                                        <span>{project.startDate.toLocaleDateString()}</span>
                                        <span className="text-xs text-gray-400">to {project.endDate.toLocaleDateString()}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex -space-x-2">
                                        {project.teamMembers.slice(0, 3).map((member) => (
                                            <Avatar key={member.id} className="h-6 w-6 border-2 border-white dark:border-gray-800">
                                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-[10px]">
                                                    {member.name.split(' ').map(n => n[0]).join('')}
                                                </AvatarFallback>
                                            </Avatar>
                                        ))}
                                        {project.teamMembers.length > 3 && (
                                            <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-[10px] font-medium">
                                                +{project.teamMembers.length - 3}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>
                                                <Eye className="h-4 w-4 mr-2" />
                                                View Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit Project
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-red-600">
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete Project
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// Timeline View Component
function TimelineView({ projects }: { projects: Project[] }) {
    if (projects.length === 0) return null

    // Calculate timeline range based on projects
    const startDate = startOfMonth(new Date(Math.min(...projects.map(p => p.startDate.getTime()))))
    // Show at least 6 months, or up to the max end date + 1 month
    const maxEndDate = new Date(Math.max(...projects.map(p => p.endDate.getTime())))
    const minEndDate = addMonths(startDate, 5)
    const endDate = endOfMonth(maxEndDate > minEndDate ? maxEndDate : minEndDate)

    const totalDays = differenceInDays(endDate, startDate) + 1

    const months = []
    let current = startDate
    while (current <= endDate) {
        months.push(current)
        current = addMonths(current, 1)
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                    {/* Header */}
                    <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <div className="w-64 flex-shrink-0 p-4 font-medium text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 sticky left-0 bg-gray-50 dark:bg-gray-900 z-10">
                            Project
                        </div>
                        <div className="flex-1 flex">
                            {months.map(month => (
                                <div key={month.toString()} className="flex-1 p-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                                    {format(month, 'MMM yyyy')}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {projects.map(project => {
                            const startOffset = differenceInDays(project.startDate, startDate)
                            const duration = differenceInDays(project.endDate, project.startDate) + 1
                            const left = (startOffset / totalDays) * 100
                            const width = (duration / totalDays) * 100

                            return (
                                <div key={project.id} className="flex hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                    <div className="w-64 flex-shrink-0 p-4 border-r border-gray-200 dark:border-gray-700 flex items-center gap-3 sticky left-0 bg-white dark:bg-gray-800 z-10 group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50 transition-colors">
                                        <div className="text-xl">{project.clientLogo}</div>
                                        <div className="min-w-0">
                                            <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{project.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{project.clientName}</div>
                                        </div>
                                    </div>
                                    <div className="flex-1 relative h-16">
                                        {/* Grid lines */}
                                        <div className="absolute inset-0 flex pointer-events-none">
                                            {months.map(month => (
                                                <div key={month.toString()} className="flex-1 border-r border-gray-100 dark:border-gray-700/50 last:border-r-0" />
                                            ))}
                                        </div>

                                        {/* Project Bar */}
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div
                                                        className={cn(
                                                            "absolute top-1/2 -translate-y-1/2 h-8 rounded-md shadow-sm cursor-pointer hover:brightness-95 transition-all border border-white/20",
                                                            project.status === 'In Progress' ? "bg-blue-500" :
                                                                project.status === 'Completed' ? "bg-green-500" :
                                                                    project.status === 'Planning' ? "bg-purple-500" :
                                                                        project.status === 'On Hold' ? "bg-orange-500" :
                                                                            "bg-gray-400"
                                                        )}
                                                        style={{
                                                            left: `${Math.max(0, left)}%`,
                                                            width: `${Math.min(100 - Math.max(0, left), width)}%`
                                                        }}
                                                    >
                                                        {width > 5 && (
                                                            <div className="px-2 h-full flex items-center text-xs font-medium text-white truncate">
                                                                {project.progress}%
                                                            </div>
                                                        )}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <div className="text-xs">
                                                        <div className="font-semibold">{project.name}</div>
                                                        <div>{format(project.startDate, 'MMM d')} - {format(project.endDate, 'MMM d, yyyy')}</div>
                                                        <div>{project.status} • {project.progress}%</div>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
