import { useState, useEffect } from 'react'
import {
  Users,
  FileText,
  AlertTriangle,
  LayoutGrid,
  List,
  Table as TableIcon,
  Table2,
  Plus,
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Building2,
  Mail,
  Phone,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  FolderOpen,
  Clock,
  User,
  ExternalLink,
  Pencil,
  StickyNote,
  Archive,
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
import { AddClientDialog } from '@/components/AddClientDialog'
import { cn } from '@/lib/utils'

// Client interface
interface Client {
  id: string
  name: string
  logoUrl?: string
  status: 'Active' | 'Inactive' | 'Prospect' | 'Archived'
  riskLevel: 'High' | 'Medium' | 'Low'
  industry: string
  companySize: 'Enterprise' | 'SMB' | 'Startup'
  primaryContact: string
  email: string
  phone?: string
  lastActivity: string // relative time like "2 days ago"
  lastActivityDate: Date
  tags: string[] // e.g., ["PCI", "Annual", "VIP"]
  projectsCount: number
  reportsCount: number
  totalFindings: number
  findingsBySeverity: {
    critical: number
    high: number
    medium: number
    low: number
  }
  createdAt: Date
  updatedAt: Date
}

// Mock data for demonstration
const mockClients: Client[] = [
  {
    id: '1',
    name: 'Acme Corporation',
    logoUrl: '🏢',
    status: 'Active',
    riskLevel: 'High',
    industry: 'Financial Services',
    companySize: 'Enterprise',
    primaryContact: 'John Smith',
    email: 'john@acme.com',
    phone: '+1 (555) 123-4567',
    lastActivity: '2 days ago',
    lastActivityDate: new Date('2024-03-20'),
    tags: ['PCI', 'Annual', 'VIP'],
    projectsCount: 3,
    reportsCount: 2,
    totalFindings: 12,
    findingsBySeverity: {
      critical: 3,
      high: 4,
      medium: 3,
      low: 2
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-03-20')
  },
  {
    id: '2',
    name: 'TechStart Inc',
    logoUrl: '🚀',
    status: 'Active',
    riskLevel: 'Medium',
    industry: 'Technology',
    companySize: 'Startup',
    primaryContact: 'Sarah Johnson',
    email: 'sarah@techstart.io',
    phone: '+1 (555) 234-5678',
    lastActivity: '1 hour ago',
    lastActivityDate: new Date('2024-03-22'),
    tags: ['SOC2', 'Quarterly'],
    projectsCount: 5,
    reportsCount: 1,
    totalFindings: 8,
    findingsBySeverity: {
      critical: 1,
      high: 2,
      medium: 3,
      low: 2
    },
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-03-22')
  },
  {
    id: '3',
    name: 'Global Finance Ltd',
    logoUrl: '💼',
    status: 'Active',
    riskLevel: 'High',
    industry: 'Banking',
    companySize: 'Enterprise',
    primaryContact: 'Michael Chen',
    email: 'mchen@globalfinance.com',
    phone: '+1 (555) 345-6789',
    lastActivity: '1 day ago',
    lastActivityDate: new Date('2024-03-21'),
    tags: ['PCI', 'GDPR', 'Critical'],
    projectsCount: 2,
    reportsCount: 3,
    totalFindings: 15,
    findingsBySeverity: {
      critical: 5,
      high: 6,
      medium: 3,
      low: 1
    },
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-03-21')
  },
  {
    id: '4',
    name: 'HealthTech Solutions',
    logoUrl: '🏥',
    status: 'Prospect',
    riskLevel: 'Low',
    industry: 'Healthcare',
    companySize: 'SMB',
    primaryContact: 'Emily Rodriguez',
    email: 'emily@healthtech.com',
    phone: '+1 (555) 456-7890',
    lastActivity: 'Just now',
    lastActivityDate: new Date('2024-03-23'),
    tags: ['HIPAA', 'New'],
    projectsCount: 1,
    reportsCount: 0,
    totalFindings: 4,
    findingsBySeverity: {
      critical: 0,
      high: 1,
      medium: 2,
      low: 1
    },
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-23')
  },
  {
    id: '5',
    name: 'RetailCo International',
    logoUrl: '🛒',
    status: 'Inactive',
    riskLevel: 'Medium',
    industry: 'Retail',
    companySize: 'Enterprise',
    primaryContact: 'David Martinez',
    email: 'dmartinez@retailco.com',
    phone: '+1 (555) 567-8901',
    lastActivity: '3 weeks ago',
    lastActivityDate: new Date('2024-03-01'),
    tags: ['PCI-DSS', 'Archived'],
    projectsCount: 0,
    reportsCount: 5,
    totalFindings: 22,
    findingsBySeverity: {
      critical: 2,
      high: 8,
      medium: 7,
      low: 5
    },
    createdAt: new Date('2023-08-15'),
    updatedAt: new Date('2024-03-01')
  }
]

type ViewMode = 'card' | 'table' | 'list'

export default function Clients() {
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Array<{ id: string, label: string, value: string }>>([])
  const [clients, setClients] = useState(mockClients)
  const [addClientDialogOpen, setAddClientDialogOpen] = useState(false)

  // Load saved view mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('clientsViewMode')
    if (saved && (saved === 'card' || saved === 'table' || saved === 'list')) {
      setViewMode(saved)
    }
  }, [])

  // Save view mode to localStorage
  useEffect(() => {
    localStorage.setItem('clientsViewMode', viewMode)
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
    // Placeholder for filter dialog
    console.log('Open filter dialog')
  }

  const openAddClientDialog = () => {
    setAddClientDialogOpen(true)
  }

  const handleClientAdded = (newClient: any) => {
    setClients([...clients, newClient])
    console.log('New client added:', newClient)
  }

  // Calculate stats
  const stats = {
    totalClients: clients.length,
    activeProjects: clients.reduce((sum, c) => sum + c.projectsCount, 0),
    pendingReports: clients.reduce((sum, c) => sum + c.reportsCount, 0),
    openFindings: clients.reduce((sum, c) => sum + c.totalFindings, 0),
    criticalFindings: clients.reduce((sum, c) => sum + c.findingsBySeverity.critical, 0)
  }

  // Filter clients based on search
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.primaryContact.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Clients</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your client organizations and contacts
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Total Clients"
          value={stats.totalClients}
          trend="+12%"
          trendUp={true}
          color="blue"
        />
        <StatCard
          icon={<FolderOpen className="w-6 h-6" />}
          label="Active Projects"
          value={stats.activeProjects}
          trend="+8%"
          trendUp={true}
          color="green"
        />
        <StatCard
          icon={<FileText className="w-6 h-6" />}
          label="Pending Reports"
          value={stats.pendingReports}
          trend="-5%"
          trendUp={false}
          color="yellow"
        />
        <StatCard
          icon={<AlertTriangle className="w-6 h-6" />}
          label="Open Findings"
          value={stats.openFindings}
          badge={stats.criticalFindings}
          badgeLabel="critical"
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
                placeholder="Search clients by name, contact, email, industry, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={openAddClientDialog} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>

            {/* Enhanced Filter Button with Count Badge */}
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
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="h-8 w-8 p-0"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>List View</TooltipContent>
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
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-4 p-4 border rounded-lg border-gray-200 dark:border-gray-700">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-96" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-14" />
                </div>
                <div className="flex gap-6">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      )}

      {/* Content Views */}
      {!isLoading && filteredClients.length > 0 && (
        <>
          {viewMode === 'card' && <CardView clients={filteredClients} />}
          {viewMode === 'table' && <TableView clients={filteredClients} />}
          {viewMode === 'list' && <ListView clients={filteredClients} />}
        </>
      )}

      {/* Empty State: No clients exist */}
      {!isLoading && clients.length === 0 && !searchQuery && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-16 w-16 text-muted-foreground mb-4 animate-pulse" />
          <h3 className="text-lg font-semibold mb-2">No clients yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Get started by adding your first client organization to begin tracking
            pentesting projects and managing vulnerabilities.
          </p>
          <Button onClick={openAddClientDialog} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Add Your First Client
          </Button>
        </div>
      )}

      {/* Empty State: No search results */}
      {!isLoading && filteredClients.length === 0 && searchQuery && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No clients found</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            No clients match your search "{searchQuery}". Try adjusting your
            filters or search terms.
          </p>
          <Button variant="outline" onClick={clearSearch}>
            <X className="h-4 w-4 mr-2" />
            Clear Search
          </Button>
        </div>
      )}

      {/* Add Client Dialog */}
      <AddClientDialog
        open={addClientDialogOpen}
        onOpenChange={setAddClientDialogOpen}
        onClientAdded={handleClientAdded}
      />
    </div>
  )
}

// Enhanced Stats Card Component
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
  color: 'blue' | 'green' | 'yellow' | 'red'
}) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-100 dark:border-blue-800'
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-100 dark:border-green-800'
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-100 dark:border-yellow-800'
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-100 dark:border-red-800'
    }
  }

  const colors = colorClasses[color]

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow border-gray-200 dark:border-gray-700">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          {/* Icon with colored background */}
          <div className={`p - 3 rounded - lg ${colors.bg} `}>
            <div className={colors.text}>
              {icon}
            </div>
          </div>
          {/* Trend badge */}
          {trend && (
            <Badge variant="secondary" className="text-xs font-medium">
              {trendUp ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {trend}
            </Badge>
          )}
        </div>
        {/* Large number */}
        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
          {value}
        </div>
        {/* Label with optional badge */}
        {badge !== undefined ? (
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <Badge variant="destructive" className="text-xs px-2 py-0.5 font-semibold animate-pulse">
              {badge} {badgeLabel}
            </Badge>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        )}
      </CardContent>
    </Card>
  )
}

// Card View Component
function CardView({ clients }: { clients: Client[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {clients.map((client) => (
        <div
          key={client.id}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow overflow-hidden group"
        >
          {/* Card Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{client.logoUrl}</div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{client.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{client.primaryContact}</p>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Mail className="w-4 h-4" />
              <span className="truncate">{client.email}</span>
            </div>
            {client.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Phone className="w-4 h-4" />
                <span>{client.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Building2 className="w-4 h-4" />
              <span className="truncate">{client.industry} • {client.companySize}</span>
            </div>
          </div>

          {/* Card Stats */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{client.projectsCount}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Projects</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{client.reportsCount}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Reports</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {client.totalFindings}
                {client.findingsBySeverity.critical > 0 && (
                  <span className="ml-1 text-xs text-red-600">({client.findingsBySeverity.critical})</span>
                )}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Findings</p>
            </div>
          </div>

          {/* Card Actions */}
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <Eye className="w-4 h-4" />
              View
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// Table View Component
function TableView({ clients }: { clients: Client[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Projects
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Reports
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Findings
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Activity
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{client.logoUrl}</div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{client.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{client.industry}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">{client.primaryContact}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{client.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full">
                    {client.projectsCount} active
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 dark:text-white">{client.reportsCount} pending</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-white">{client.totalFindings}</span>
                    {client.findingsBySeverity.critical > 0 && (
                      <span className="px-2 py-1 text-xs font-semibold bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-full">
                        {client.findingsBySeverity.critical} critical
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {client.lastActivity}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Enhanced List View Component with 4-line structure
function ListView({ clients }: { clients: Client[] }) {
  return (
    <div className="space-y-3">
      {clients.map((client) => (
        <div
          key={client.id}
          className="flex items-start gap-4 p-4 border rounded-lg hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          onClick={() => {
            // Navigate to client detail
            console.log('Navigate to client:', client.id)
          }}
        >
          {/* Avatar/Logo */}
          <Avatar className="h-12 w-12 ring-2 ring-border">
            <AvatarImage src={client.logoUrl} alt={client.name} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-lg">
              {client.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* LINE 1: Name + Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg truncate hover:text-primary transition-colors text-gray-900 dark:text-white">
                {client.name}
              </h3>

              {/* Status Badge with color coding */}
              <Badge
                className={cn(
                  "text-xs font-medium",
                  client.status === 'Active' && "bg-green-500 hover:bg-green-600",
                  client.status === 'Inactive' && "bg-yellow-500 hover:bg-yellow-600 text-black",
                  client.status === 'Prospect' && "bg-blue-500 hover:bg-blue-600",
                  client.status === 'Archived' && "bg-gray-500 hover:bg-gray-600"
                )}
              >
                {client.status === 'Active' && '🟢 '}
                {client.status === 'Inactive' && '🟡 '}
                {client.status === 'Prospect' && '🔵 '}
                {client.status === 'Archived' && '⚫ '}
                {client.status}
              </Badge>

              {/* Risk Badge with color coding */}
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-medium border-2",
                  client.riskLevel === 'High' && "border-red-500 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-400",
                  client.riskLevel === 'Medium' && "border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400",
                  client.riskLevel === 'Low' && "border-green-500 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-400"
                )}
              >
                {client.riskLevel === 'High' && '🔴 '}
                {client.riskLevel === 'Medium' && '🟡 '}
                {client.riskLevel === 'Low' && '🟢 '}
                {client.riskLevel} Risk
              </Badge>

              {/* Industry & Company Size */}
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {client.industry} • {client.companySize}
              </span>
            </div>

            {/* LINE 2: Contact + Activity */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{client.primaryContact}</span>
              </div>
              <span>•</span>
              <a
                href={`mailto:${client.email}`}
                className="hover:text-primary hover:underline flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail className="h-3.5 w-3.5" />
                {client.email}
              </a>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>Last activity: {client.lastActivity}</span>
              </div>
            </div>

            {/* LINE 3: Tags */}
            {client.tags && client.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {client.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs px-2 py-0.5 bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* LINE 4: Stats with Severity Breakdown */}
            <div className="flex items-center gap-6 text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
              {/* Projects */}
              <div className="flex items-center gap-1.5">
                <FolderOpen className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-foreground">{client.projectsCount}</span>
                <span className="text-muted-foreground">Projects</span>
              </div>

              {/* Reports */}
              <div className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-foreground">{client.reportsCount}</span>
                <span className="text-muted-foreground">Reports</span>
              </div>

              {/* Findings with Severity Pills */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="font-semibold text-foreground">{client.totalFindings}</span>
                  <span className="text-muted-foreground">Findings</span>
                </div>

                {/* Severity Breakdown */}
                {client.findingsBySeverity && (
                  <div className="flex gap-1 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                    {client.findingsBySeverity.critical > 0 && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0 font-bold">
                        {client.findingsBySeverity.critical} Critical
                      </Badge>
                    )}
                    {client.findingsBySeverity.high > 0 && (
                      <Badge className="text-xs px-1.5 py-0 bg-orange-500 hover:bg-orange-600">
                        {client.findingsBySeverity.high} High
                      </Badge>
                    )}
                    {client.findingsBySeverity.medium > 0 && (
                      <Badge className="text-xs px-1.5 py-0 bg-yellow-500 hover:bg-yellow-600 text-black">
                        {client.findingsBySeverity.medium} Med
                      </Badge>
                    )}
                    {client.findingsBySeverity.low > 0 && (
                      <Badge className="text-xs px-1.5 py-0 bg-green-500 hover:bg-green-600">
                        {client.findingsBySeverity.low} Low
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons - Show on hover */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                console.log('View client:', client.id)
              }}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              View
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Client
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                  <StickyNote className="h-4 w-4 mr-2" />
                  Add Note
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Client
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  )
}

