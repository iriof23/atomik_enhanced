import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/store'
import { useUser } from '@clerk/clerk-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AddClientDialog } from '@/components/AddClientDialog'
import { AddFindingDialog } from '@/components/AddFindingDialog'
import { AddProjectDialog } from '@/components/AddProjectDialog'
import ProjectDetailModal from '@/components/ProjectDetailModal'
import { useToast } from '@/components/ui/use-toast'
import {
    Play,
    ArrowRight,
    AlertTriangle,
    Clock,
    TrendingUp,
    CheckCircle2,
    Plus,
    Search,
    FileText,
    Users,
    Zap,
    Calendar,
    MoreHorizontal,
    Activity,
    Shield
} from 'lucide-react'

// --- Helper Functions ---

function formatRelativeTime(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffSeconds < 60) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return '1d ago'
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// --- Types ---

interface Project {
    id: string
    name: string
    clientName: string
    status: string
    priority: string
    progress: number
    endDate: string
    updatedAt: string
    findings?: any[]
}

interface DashboardData {
    activeProject: Project | null
    upcomingProjects: Project[]
    stats: {
        totalFindings: number
        criticalFindings: number
        activeClients: number
        completedProjects: number
    }
    recentActivity: Array<{
        id: string
        type: 'project' | 'finding' | 'report' | 'client'
        title: string
        description: string
        timestamp: string
        timestampText?: string
        icon: React.ReactNode
        severity?: string
    }>
}

// --- Mock Store Hook (Simulating Zustand + LocalStorage) ---

const useDashboardStore = () => {
    const [data, setData] = useState<DashboardData>({
        activeProject: null,
        upcomingProjects: [],
        stats: {
            totalFindings: 0,
            criticalFindings: 0,
            activeClients: 0,
            completedProjects: 0
        },
        recentActivity: []
    })

    useEffect(() => {
        // Load data from localStorage
        const projects: Project[] = JSON.parse(localStorage.getItem('projects') || '[]')
        const clients = JSON.parse(localStorage.getItem('clients') || '[]')

        // Calculate Stats
        let totalFindings = 0
        let criticalFindings = 0

        projects.forEach((p: any) => {
            const findingsKey = `findings_${p.id}`
            const storedFindings = localStorage.getItem(findingsKey)
            if (storedFindings) {
                try {
                    const findings = JSON.parse(storedFindings)
                    totalFindings += findings.length
                    findings.forEach((f: any) => {
                        if (f.severity === 'Critical') criticalFindings++
                    })
                } catch (e) { }
            }
        })

        // Active Project (Most recently updated 'In Progress' project)
        const activeProjects = projects.filter(p => p.status === 'In Progress' || p.status === 'Active')
        const sortedActive = [...activeProjects].sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        const activeProject = sortedActive.length > 0 ? sortedActive[0] : (projects[0] || null)

        // Upcoming Deadlines
        const upcoming = [...projects]
            .filter(p => p.status !== 'Completed' && new Date(p.endDate) > new Date())
            .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
            .slice(0, 3)

        // Recent Activity - Build comprehensive activity feed
        const activityList: Array<any> = []
        
        // Add project activities
        projects.forEach(p => {
            activityList.push({
                id: `proj-${p.id}`,
                type: 'project' as const,
                title: p.status === 'Completed' ? 'Project Completed' : 'Project Started',
                description: `${p.name} • ${p.clientName}`,
                timestamp: new Date(p.updatedAt).toISOString(),
                timestampText: formatRelativeTime(new Date(p.updatedAt)),
                icon: <Activity className="w-4 h-4 text-blue-400" />,
                severity: p.status
            })
        })
        
        // Add findings from all projects
        projects.forEach(p => {
            const findingsKey = `findings_${p.id}`
            const storedFindings = localStorage.getItem(findingsKey)
            if (storedFindings) {
                try {
                    const findings = JSON.parse(storedFindings)
                    findings.forEach((f: any) => {
                        if (f.severity === 'Critical') {
                            activityList.push({
                                id: `find-${f.id}`,
                                type: 'finding' as const,
                                title: 'Critical Finding Detected',
                                description: `${f.title} • ${p.name}`,
                                timestamp: f.createdAt || new Date().toISOString(),
                                timestampText: formatRelativeTime(new Date(f.createdAt || new Date())),
                                icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
                                severity: f.severity
                            })
                        }
                    })
                } catch (e) { }
            }
        })
        
        // Add client activities
        clients.forEach((c: any) => {
            activityList.push({
                id: `client-${c.id}`,
                type: 'client' as const,
                title: 'New Client Onboarded',
                description: `${c.name} added to portfolio`,
                timestamp: c.createdAt || new Date().toISOString(),
                timestampText: formatRelativeTime(new Date(c.createdAt || new Date())),
                icon: <Users className="w-4 h-4 text-emerald-400" />,
                severity: c.status
            })
        })
        
        // Sort by most recent and take top 5
        const activity = activityList
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5)

        setData({
            activeProject,
            upcomingProjects: upcoming,
            stats: {
                totalFindings,
                criticalFindings,
                activeClients: clients.length,
                completedProjects: projects.filter(p => p.status === 'Completed').length
            },
            recentActivity: activity.length > 0 ? activity : [
                {
                    id: 'mock-1',
                    type: 'finding',
                    title: 'SQL Injection Vulnerability',
                    description: 'Critical SQL Injection found in login form • Q4 2024 External Pentest',
                    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    timestampText: '2h ago',
                    icon: <AlertTriangle className="w-4 h-4 text-red-400" />
                },
                {
                    id: 'mock-2',
                    type: 'project',
                    title: 'New Project Started',
                    description: 'Internal Security Assessment • Acme Corporation',
                    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                    timestampText: '5h ago',
                    icon: <Activity className="w-4 h-4 text-blue-400" />
                },
                {
                    id: 'mock-3',
                    type: 'finding',
                    title: 'Cross-Site Scripting (XSS)',
                    description: 'Reflected XSS in search parameter • Web App Security Review',
                    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
                    timestampText: '8h ago',
                    icon: <AlertTriangle className="w-4 h-4 text-orange-400" />
                },
                {
                    id: 'mock-4',
                    type: 'report',
                    title: 'Report Generated',
                    description: 'Final penetration test report completed • Q3 2024 Assessment',
                    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                    timestampText: '1d ago',
                    icon: <FileText className="w-4 h-4 text-purple-400" />
                },
                {
                    id: 'mock-5',
                    type: 'client',
                    title: 'New Client Onboarded',
                    description: 'Retail Solutions Ltd added to portfolio',
                    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    timestampText: '2d ago',
                    icon: <Users className="w-4 h-4 text-emerald-400" />
                }
            ]
        })
    }, [])

    return data
}

// --- Components ---

const HeroCard = ({ 
    project, 
    onStartProject,
    onResumeReport,
    onViewDetails
}: { 
    project: Project | null
    onStartProject: () => void
    onResumeReport?: (project: Project) => void
    onViewDetails?: (project: Project) => void
}) => {
    const { user: storeUser } = useAuthStore()
    const { user: clerkUser } = useUser()
    const displayName = clerkUser?.firstName || storeUser?.name || 'Commander'

    if (!project) return (
        <Card className="col-span-1 lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
            <CardContent className="p-8 flex flex-col justify-center h-full min-h-[300px]">
                <h2 className="text-3xl font-bold tracking-tight mb-2">Welcome back, {displayName}</h2>
                <p className="text-muted-foreground mb-6">Ready to start your next mission?</p>
                <Button size="lg" className="w-fit gap-2" onClick={onStartProject}>
                    <Plus className="w-5 h-5" /> Start New Project
                </Button>
            </CardContent>
        </Card>
    )

    return (
        <Card className="col-span-1 lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-primary/10 via-card to-card border-primary/20 shadow-lg group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap className="w-32 h-32 text-primary" />
            </div>

            <CardContent className="p-8 flex flex-col justify-between h-full relative z-10">
                <div>
                    <div className="flex items-center gap-2 text-primary mb-2">
                        <Activity className="w-4 h-4 animate-pulse" />
                        <span className="text-sm font-medium uppercase tracking-wider">Current Mission</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-1">
                        {project.name}
                    </h2>
                    <p className="text-muted-foreground text-lg flex items-center gap-2">
                        {project.clientName}
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    <div className="flex flex-wrap gap-3">
                        <Badge variant="destructive" className="px-3 py-1 text-sm gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            4 Critical Issues
                        </Badge>
                        <Badge variant="secondary" className="px-3 py-1 text-sm gap-1.5 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20">
                            <Clock className="w-3.5 h-3.5" />
                            Due in 2 Days
                        </Badge>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                            <span>Mission Progress</span>
                            <span>{project.progress}%</span>
                        </div>
                        <div className="h-3 w-full bg-secondary/50 rounded-full overflow-hidden backdrop-blur-sm">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-1000 ease-out"
                                style={{ width: `${project.progress}%` }}
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-2">
                        <Button 
                            size="lg" 
                            className="gap-2 text-base px-8 shadow-primary/25 shadow-lg hover:shadow-primary/40 transition-all"
                            onClick={() => onResumeReport?.(project)}
                        >
                            <Play className="w-5 h-5 fill-current" />
                            Resume Report
                        </Button>
                        <Button 
                            size="lg" 
                            variant="outline" 
                            className="gap-2"
                            onClick={() => onViewDetails?.(project)}
                        >
                            View Details <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

const DeadlineList = ({ projects }: { projects: Project[] }) => {
    return (
        <Card className="col-span-1 h-full flex flex-col bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="w-5 h-5 text-primary" />
                    Upcoming Deadlines
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="space-y-6 relative">
                    {/* Vertical connector line */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-border/50" />

                    {projects.map((project, i) => (
                        <div key={project.id} className="relative pl-6 group cursor-pointer">
                            <div className={cn(
                                "absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 bg-background transition-colors",
                                i === 0 ? "border-red-500 group-hover:bg-red-500/20" :
                                    i === 1 ? "border-orange-500 group-hover:bg-orange-500/20" :
                                        "border-blue-500 group-hover:bg-blue-500/20"
                            )} />
                            <div className="space-y-1">
                                <h4 className="font-medium leading-none group-hover:text-primary transition-colors">
                                    {project.name}
                                </h4>
                                <div className="flex justify-between items-center text-sm text-muted-foreground">
                                    <span>{project.clientName}</span>
                                    <span className={cn(
                                        "text-xs font-medium px-2 py-0.5 rounded-full",
                                        i === 0 ? "bg-red-500/10 text-red-500" : "bg-secondary text-secondary-foreground"
                                    )}>
                                        {new Date(project.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {projects.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            No upcoming deadlines
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

const QuickStats = ({ stats }: { stats: DashboardData['stats'] }) => {
    return (
        <>
            <Card className="bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors cursor-pointer group">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:scale-110 transition-transform">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> +12%
                        </span>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-2xl font-bold tracking-tight">{stats.totalFindings}</h3>
                        <p className="text-sm text-muted-foreground">Total Findings</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors cursor-pointer group border-red-500/20">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-red-500/10 rounded-lg text-red-500 group-hover:scale-110 transition-transform">
                            <Zap className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium text-red-500 bg-red-500/10 px-2 py-1 rounded-full">
                            Action Required
                        </span>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-2xl font-bold tracking-tight text-red-500">{stats.criticalFindings}</h3>
                        <p className="text-sm text-muted-foreground">Critical Issues</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors cursor-pointer group">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 group-hover:scale-110 transition-transform">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-2xl font-bold tracking-tight">{stats.activeClients}</h3>
                        <p className="text-sm text-muted-foreground">Active Clients</p>
                    </div>
                </CardContent>
            </Card>
        </>
    )
}

const QuickActions = ({ onNewFinding, onNewClient, onNewReport, onSearch }: { 
    onNewFinding: () => void
    onNewClient: () => void
    onNewReport: () => void
    onSearch: () => void
}) => {
    const actions = [
        { 
            icon: <Shield className="w-5 h-5" />, 
            label: 'New Finding', 
            color: 'text-red-500',
            onClick: onNewFinding,
            description: 'Add vulnerability'
        },
        { 
            icon: <Users className="w-5 h-5" />, 
            label: 'New Client', 
            color: 'text-blue-500',
            onClick: onNewClient,
            description: 'Add organization'
        },
        { 
            icon: <FileText className="w-5 h-5" />, 
            label: 'New Report', 
            color: 'text-purple-500',
            onClick: onNewReport,
            description: 'Generate document'
        },
        { 
            icon: <Search className="w-5 h-5" />, 
            label: 'Search', 
            color: 'text-cyan-500',
            onClick: onSearch,
            description: 'Find anything'
        },
    ]

    return (
        <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                    {actions.map((action, i) => (
                        <Button
                            key={i}
                            variant="outline"
                            onClick={action.onClick}
                            className="h-24 flex flex-col gap-2 hover:bg-accent/50 hover:border-primary/50 transition-all group"
                        >
                            <div className={cn(action.color, "group-hover:scale-110 transition-transform")}>
                                {action.icon}
                            </div>
                            <div className="text-center">
                                <div className="text-xs font-medium">{action.label}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">{action.description}</div>
                            </div>
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

const PulseFeed = ({ activity }: { activity: DashboardData['recentActivity'] }) => {
    return (
        <Card className="col-span-1 lg:col-span-3 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Mission Pulse
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-1">
                    {activity.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                        >
                            <div className="p-2 rounded-full bg-background border border-border group-hover:border-primary/50 transition-colors">
                                {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                                    {item.title}
                                </h4>
                                <p className="text-muted-foreground text-xs truncate">
                                    {item.description}
                                </p>
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                                {item.timestampText || item.timestamp}
                            </div>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

// --- Main Dashboard Component ---

export default function Dashboard() {
    const navigate = useNavigate()
    const { toast } = useToast()
    const data = useDashboardStore()
    
    // Dialog states
    const [showClientDialog, setShowClientDialog] = useState(false)
    const [showFindingDialog, setShowFindingDialog] = useState(false)
    const [showProjectDialog, setShowProjectDialog] = useState(false)
    const [viewingProject, setViewingProject] = useState<any | null>(null)
    
    // Load clients for project dialog
    const [clients, setClients] = useState<any[]>([])
    
    useEffect(() => {
        const storedClients = JSON.parse(localStorage.getItem('clients') || '[]')
        setClients(storedClients)
    }, [showProjectDialog])
    
    // Handlers
    const handleNewClient = () => {
        setShowClientDialog(true)
    }
    
    const handleNewFinding = () => {
        setShowFindingDialog(true)
    }
    
    const handleNewReport = () => {
        navigate('/report-builder')
    }
    
    const handleSearch = () => {
        // Navigate to a global search page or show search command palette
        toast({
            title: "Global Search",
            description: "Search across reports, clients, and projects (coming soon)",
        })
        // TODO: Implement global search modal or navigate to search page
        // For now, navigate to projects page which has search functionality
        navigate('/projects')
    }
    
    const handleStartProject = () => {
        setShowProjectDialog(true)
    }
    
    const handleResumeReport = (project: Project) => {
        // Navigate to the report editor for this project
        navigate(`/reports/${project.id}`)
    }
    
    const handleViewDetails = (project: Project) => {
        // Load full project data from localStorage
        const storedProjects = JSON.parse(localStorage.getItem('projects') || '[]')
        const fullProject = storedProjects.find((p: any) => p.id === project.id)
        
        if (fullProject) {
            // Convert date strings back to Date objects
            setViewingProject({
                ...fullProject,
                startDate: new Date(fullProject.startDate),
                endDate: new Date(fullProject.endDate),
                lastActivityDate: fullProject.lastActivityDate ? new Date(fullProject.lastActivityDate) : new Date(),
                createdAt: fullProject.createdAt ? new Date(fullProject.createdAt) : new Date(),
                updatedAt: fullProject.updatedAt ? new Date(fullProject.updatedAt) : new Date(),
                // Ensure arrays exist
                scope: fullProject.scope || [],
                teamMembers: fullProject.teamMembers || [],
                complianceFrameworks: fullProject.complianceFrameworks || [],
                // Ensure findingsBySeverity exists
                findingsBySeverity: fullProject.findingsBySeverity || { critical: 0, high: 0, medium: 0, low: 0 }
            })
        } else {
            // Fallback to basic project data if not found in localStorage
            setViewingProject({
                ...project,
                type: 'External',
                complianceFrameworks: [],
                scope: [],
                methodology: 'OWASP',
                teamMembers: [],
                leadTester: '',
                findingsBySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
                findingsCount: 0,
                description: '',
                lastActivity: '',
                lastActivityDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                startDate: new Date(),
                endDate: new Date(project.endDate),
                clientId: '1',
                clientLogoUrl: '🏢'
            })
        }
    }
    
    const handleClientAdded = (client: any) => {
        // Save to localStorage
        const existingClients = JSON.parse(localStorage.getItem('clients') || '[]')
        const updatedClients = [...existingClients, client]
        localStorage.setItem('clients', JSON.stringify(updatedClients))
        
        toast({
            title: "Client Added",
            description: `${client.name} has been added successfully.`,
        })
        
        // Refresh clients list
        setClients(updatedClients)
        
        // Trigger page refresh to update dashboard
        window.location.reload()
    }
    
    const handleFindingAdded = (finding: any) => {
        // For findings without a project, save to a global findings list
        const existingFindings = JSON.parse(localStorage.getItem('global_findings') || '[]')
        const updatedFindings = [...existingFindings, {
            ...finding,
            createdAt: new Date().toISOString(),
            status: 'Draft'
        }]
        localStorage.setItem('global_findings', JSON.stringify(updatedFindings))
        
        toast({
            title: "Finding Added",
            description: `${finding.title} has been added to your findings library.`,
        })
        
        // Trigger page refresh to update stats
        window.location.reload()
    }
    
    const handleProjectAdded = (project: any) => {
        // Save to localStorage
        const existingProjects = JSON.parse(localStorage.getItem('projects') || '[]')
        const updatedProjects = [...existingProjects, project]
        localStorage.setItem('projects', JSON.stringify(updatedProjects))
        
        toast({
            title: "Project Created",
            description: `${project.name} has been created successfully.`,
        })
        
        // Trigger page refresh to update dashboard
        window.location.reload()
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Mission Control</h1>
                    <p className="text-muted-foreground mt-1">
                        {data.stats.activeClients} active projects • {data.stats.criticalFindings} critical findings require attention
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card/50 px-3 py-1 rounded-full border border-border/50">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    System Operational
                </div>
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Row 1: Focus Zone + Horizon */}
                <HeroCard 
                    project={data.activeProject} 
                    onStartProject={handleStartProject}
                    onResumeReport={handleResumeReport}
                    onViewDetails={handleViewDetails}
                />
                <DeadlineList projects={data.upcomingProjects} />

                {/* Row 2: Quick Stats & Actions */}
                <QuickStats stats={data.stats} />
                <QuickActions 
                    onNewFinding={handleNewFinding}
                    onNewClient={handleNewClient}
                    onNewReport={handleNewReport}
                    onSearch={handleSearch}
                />

                {/* Row 3: Pulse Feed */}
                <PulseFeed activity={data.recentActivity} />
            </div>
            
            {/* Dialogs */}
            <AddClientDialog
                open={showClientDialog}
                onOpenChange={setShowClientDialog}
                onClientAdded={handleClientAdded}
            />
            
            <AddFindingDialog
                open={showFindingDialog}
                onOpenChange={setShowFindingDialog}
                onFindingAdded={handleFindingAdded}
            />
            
            <AddProjectDialog
                open={showProjectDialog}
                onOpenChange={setShowProjectDialog}
                onProjectAdded={handleProjectAdded}
                clients={clients}
            />
            
            {/* Project Detail Modal */}
            <ProjectDetailModal
                project={viewingProject}
                open={!!viewingProject}
                onClose={() => setViewingProject(null)}
                onEdit={(project) => {
                    setViewingProject(null)
                    // TODO: Implement edit project
                    toast({
                        title: "Edit Project",
                        description: "Project editing will be available soon.",
                    })
                }}
                onGenerateReport={(project) => {
                    setViewingProject(null)
                    navigate(`/reports/${project.id}`)
                }}
                onDelete={(project) => {
                    setViewingProject(null)
                    // TODO: Implement delete project
                    toast({
                        title: "Delete Project",
                        description: "Project deletion will be available soon.",
                        variant: "destructive",
                    })
                }}
            />
        </div>
    )
}
