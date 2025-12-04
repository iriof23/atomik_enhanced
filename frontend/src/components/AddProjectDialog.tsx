import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    FolderKanban,
    Target,
    Calendar as CalendarIcon,
    Users,
    Check,
    ChevronRight,
    ChevronLeft,
    X,
    Shield,
    Globe,
    Smartphone,
    Server,
    Cloud,
    Wifi,
    FileCode,
    Loader2,
    Building2
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { api } from '@/lib/api'

interface AddProjectDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onProjectAdded?: (project: any) => void
    clients: any[]
    editingProject?: any
}

const parseScopeField = (rawScope: any): string[] => {
    if (!rawScope) return []
    if (Array.isArray(rawScope)) return rawScope.filter(Boolean)
    
    if (typeof rawScope === 'string') {
        try {
            const parsed = JSON.parse(rawScope)
            if (Array.isArray(parsed)) {
                return parsed.filter(Boolean)
            }
        } catch {
            return rawScope
                .split(/[\n,]+/)
                .map(item => item.trim())
                .filter(Boolean)
        }
        
        return rawScope ? [rawScope].filter(Boolean) : []
    }
    
    return []
}

export function AddProjectDialog({ open, onOpenChange, onProjectAdded, clients, editingProject }: AddProjectDialogProps) {
    const { getToken } = useAuth()
    const { toast } = useToast()
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [startDateOpen, setStartDateOpen] = useState(false)
    const [endDateOpen, setEndDateOpen] = useState(false)
    
    const [formData, setFormData] = useState({
        name: '',
        clientId: '',
        clientName: '',
        type: 'External',
        description: '',
        scope: [] as string[],
        methodology: 'OWASP Testing Guide v4',
        complianceFrameworks: [] as string[],
        startDate: undefined as Date | undefined,
        endDate: undefined as Date | undefined,
        priority: 'Medium',
        status: 'Planning',
        leadTester: '',
        teamMembers: [] as string[]
    })

    useEffect(() => {
        if (editingProject) {
            const parsedScope = parseScopeField(editingProject.scope)
            
            let parsedComplianceFrameworks: string[] = []
            if (editingProject.complianceFrameworks || editingProject.compliance_frameworks) {
                try {
                    const frameworks = editingProject.complianceFrameworks || editingProject.compliance_frameworks
                    parsedComplianceFrameworks = typeof frameworks === 'string'
                        ? JSON.parse(frameworks)
                        : frameworks
                } catch {
                    parsedComplianceFrameworks = []
                }
            }
            
            setFormData({
                name: editingProject.name || '',
                clientId: editingProject.clientId || editingProject.client_id || '',
                clientName: editingProject.clientName || editingProject.client_name || '',
                type: editingProject.type || editingProject.project_type || 'External',
                description: editingProject.description || '',
                scope: parsedScope,
                methodology: editingProject.methodology || 'OWASP Testing Guide v4',
                complianceFrameworks: parsedComplianceFrameworks,
                startDate: editingProject.startDate || editingProject.start_date ? new Date(editingProject.startDate || editingProject.start_date) : undefined,
                endDate: editingProject.endDate || editingProject.end_date ? new Date(editingProject.endDate || editingProject.end_date) : undefined,
                priority: editingProject.priority || 'Medium',
                status: editingProject.status || 'Planning',
                leadTester: editingProject.leadTester || editingProject.lead_id || '',
                teamMembers: editingProject.teamMembers?.map((m: any) => m.id || m) || []
            })
        } else {
            setFormData({
                name: '',
                clientId: '',
                clientName: '',
                type: 'External',
                description: '',
                scope: [],
                methodology: 'OWASP Testing Guide v4',
                complianceFrameworks: [],
                startDate: undefined,
                endDate: undefined,
                priority: 'Medium',
                status: 'Planning',
                leadTester: '',
                teamMembers: []
            })
        }
    }, [editingProject, open])

    const [scopeInput, setScopeInput] = useState('')
    const totalSteps = 4
    const stepLabels = ['Basics', 'Scope', 'Timeline', 'Team']

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const addScopeItem = () => {
        if (scopeInput.trim() && !formData.scope.includes(scopeInput.trim())) {
            updateField('scope', [...formData.scope, scopeInput.trim()])
            setScopeInput('')
        }
    }

    const removeScopeItem = (item: string) => {
        updateField('scope', formData.scope.filter(i => i !== item))
    }

    const toggleCompliance = (framework: string) => {
        if (formData.complianceFrameworks.includes(framework)) {
            updateField('complianceFrameworks', formData.complianceFrameworks.filter(f => f !== framework))
        } else {
            updateField('complianceFrameworks', [...formData.complianceFrameworks, framework])
        }
    }

    const handleNext = () => {
        if (step < totalSteps) setStep(step + 1)
    }

    const handleBack = () => {
        if (step > 1) setStep(step - 1)
    }

    const handleSubmit = async () => {
        if (isSubmitting) return
        setIsSubmitting(true)

        try {
            const token = await getToken()
            if (!token) {
                toast({
                    title: 'Error',
                    description: 'Authentication token not available.',
                    variant: 'destructive',
                })
                return
            }

            const selectedClient = clients.find(c => c.id === formData.clientId)

            const payload: Record<string, any> = {
                name: formData.name.trim(),
                client_id: formData.clientId,
            }
            
            if (formData.description?.trim()) {
                payload.description = formData.description.trim()
            }
            if (formData.startDate) {
                payload.start_date = formData.startDate.toISOString()
            }
            if (formData.endDate) {
                payload.end_date = formData.endDate.toISOString()
            }
            if (formData.type) {
                payload.project_type = formData.type
            }
            payload.scope = JSON.stringify(formData.scope || [])
            if (formData.methodology) {
                payload.methodology = formData.methodology
            }
            if (formData.complianceFrameworks && formData.complianceFrameworks.length > 0) {
                payload.compliance_frameworks = JSON.stringify(formData.complianceFrameworks)
            }
            if (formData.priority) {
                payload.priority = formData.priority
            }
            if (formData.status) {
                const statusMap: Record<string, string> = {
                    'Planning': 'PLANNING',
                    'In Progress': 'IN_PROGRESS',
                    'On Hold': 'ON_HOLD',
                    'Completed': 'COMPLETED',
                    'Cancelled': 'CANCELLED',
                }
                payload.status = statusMap[formData.status] || 'PLANNING'
            }

            let projectData
            if (editingProject) {
                const response = await api.put(`/projects/${editingProject.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                projectData = response.data
                toast({
                    title: 'Project Updated',
                    description: `${projectData.name} has been updated successfully.`,
                })
            } else {
                const response = await api.post('/projects/', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                projectData = response.data
                toast({
                    title: 'Project Created',
                    description: `${projectData.name} has been created successfully.`,
                })
            }

            const frontendProjectData = {
                id: projectData.id,
                name: projectData.name,
                description: projectData.description,
                clientId: projectData.client_id,
                clientName: projectData.client_name || selectedClient?.name || 'Unknown Client',
                clientLogoUrl: selectedClient?.logoUrl || '',
                type: formData.type,
                status: projectData.status || 'Planning',
                priority: formData.priority,
                startDate: projectData.start_date ? new Date(projectData.start_date) : formData.startDate,
                endDate: projectData.end_date ? new Date(projectData.end_date) : formData.endDate,
                progress: 0,
                findingsCount: projectData.finding_count || 0,
                findingsBySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
                teamMembers: [],
                methodology: formData.methodology,
                complianceFrameworks: formData.complianceFrameworks,
                scope: formData.scope,
                lastActivity: 'Just now',
                lastActivityDate: new Date(),
                createdAt: new Date(projectData.created_at),
                updatedAt: new Date(projectData.updated_at),
            }

            onProjectAdded?.(frontendProjectData)
            onOpenChange(false)

            setStep(1)
            setFormData({
                name: '',
                clientId: '',
                clientName: '',
                type: 'External',
                description: '',
                scope: [],
                methodology: 'PTES',
                complianceFrameworks: [],
                startDate: undefined,
                endDate: undefined,
                priority: 'Medium',
                status: 'Planning',
                leadTester: '',
                teamMembers: []
            })
        } catch (error: any) {
            console.error('Failed to create/update project:', error)
            toast({
                title: 'Error',
                description: error.response?.data?.detail || 'Failed to save project. Please try again.',
                variant: 'destructive',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto bg-white border-slate-200">
                <DialogHeader className="pb-4">
                    <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <FolderKanban className="h-4 w-4 text-emerald-600" />
                        </div>
                        {editingProject ? 'Edit Project' : 'Create New Project'}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500">
                        {editingProject 
                            ? 'Update project details, scope, timeline, and team'
                            : 'Define scope, timeline, and team for a new penetration test'
                        }
                    </DialogDescription>
                </DialogHeader>

                {/* Premium Step Indicator */}
                <div className="flex items-center justify-between mb-6 px-4">
                    {[1, 2, 3, 4].map((s, idx) => (
                        <div key={s} className="flex items-center flex-1">
                            <div className="flex flex-col items-center flex-1">
                                <div
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all z-10",
                                        step > s
                                            ? "bg-emerald-600 text-white"
                                            : step === s
                                                ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                                                : "bg-slate-100 text-slate-400"
                                    )}
                                >
                                    {step > s ? <Check className="h-4 w-4" /> : s}
                                </div>
                                <span className={cn(
                                    "text-xs mt-2 font-medium",
                                    step >= s ? "text-emerald-600" : "text-slate-400"
                                )}>
                                    {stepLabels[idx]}
                                </span>
                            </div>
                            {s < totalSteps && (
                                <div className={cn(
                                    "h-px flex-1 mx-2 transition-all -mt-5",
                                    step > s ? "bg-emerald-600" : "bg-slate-200"
                                )} />
                            )}
                        </div>
                    ))}
                </div>

                <div className="min-h-[280px]">
                    {/* Step 1: Project Basics */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                                    Project Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Q1 2024 External Pentest"
                                    value={formData.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    className="h-10 text-sm border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium text-slate-700">
                                        Client <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={formData.clientId}
                                        onValueChange={(value) => updateField('clientId', value)}
                                    >
                                        <SelectTrigger className="h-10 text-sm border-slate-200 focus:ring-emerald-500/20">
                                            <SelectValue placeholder={clients.length === 0 ? "Loading..." : "Select client..."} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-slate-200">
                                            {clients.length === 0 ? (
                                                <div className="p-2 text-sm text-slate-500 text-center">
                                                    No clients available
                                                </div>
                                            ) : (
                                                clients.map((client) => (
                                                    <SelectItem key={client.id} value={client.id} className="text-sm">
                                                        <span className="flex items-center gap-2">
                                                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                            {client.name}
                                                        </span>
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {clients.length > 0 && (
                                        <p className="text-xs text-slate-500">{clients.length} client(s) available</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium text-slate-700">Testing Type</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(value) => updateField('type', value)}
                                    >
                                        <SelectTrigger className="h-10 text-sm border-slate-200 focus:ring-emerald-500/20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-slate-200">
                                            <SelectItem value="External" className="text-sm"><span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-slate-400" /> External Network</span></SelectItem>
                                            <SelectItem value="Internal" className="text-sm"><span className="flex items-center gap-2"><Server className="w-3.5 h-3.5 text-slate-400" /> Internal Network</span></SelectItem>
                                            <SelectItem value="Web App" className="text-sm"><span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-slate-400" /> Web Application</span></SelectItem>
                                            <SelectItem value="Mobile" className="text-sm"><span className="flex items-center gap-2"><Smartphone className="w-3.5 h-3.5 text-slate-400" /> Mobile App</span></SelectItem>
                                            <SelectItem value="API" className="text-sm"><span className="flex items-center gap-2"><FileCode className="w-3.5 h-3.5 text-slate-400" /> API</span></SelectItem>
                                            <SelectItem value="Cloud" className="text-sm"><span className="flex items-center gap-2"><Cloud className="w-3.5 h-3.5 text-slate-400" /> Cloud Infrastructure</span></SelectItem>
                                            <SelectItem value="Network" className="text-sm"><span className="flex items-center gap-2"><Wifi className="w-3.5 h-3.5 text-slate-400" /> Wireless/Network</span></SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="description" className="text-sm font-medium text-slate-700">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Brief description of the engagement..."
                                    value={formData.description}
                                    onChange={(e) => updateField('description', e.target.value)}
                                    rows={3}
                                    className="text-sm border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Scope & Methodology */}
                    {step === 2 && (
                        <div className="space-y-5">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <Target className="w-3.5 h-3.5 text-emerald-600" />
                                    Scope Definition
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Add domain, IP range, or URL"
                                        value={scopeInput}
                                        onChange={(e) => setScopeInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addScopeItem())}
                                        className="h-10 text-sm border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                                    />
                                    <Button 
                                        type="button" 
                                        onClick={addScopeItem} 
                                        variant="outline"
                                        size="sm"
                                        className="h-10 px-4 border-slate-200 text-slate-600 hover:bg-slate-50"
                                    >
                                        Add
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 min-h-[50px] p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                                    {formData.scope.length === 0 && (
                                        <span className="text-xs text-slate-400">No scope items added yet</span>
                                    )}
                                    {formData.scope.map((item) => (
                                        <Badge key={item} variant="secondary" className="gap-1 pl-2.5 pr-1.5 py-1 bg-white border border-slate-200 text-slate-700">
                                            {item}
                                            <button onClick={() => removeScopeItem(item)} className="hover:bg-slate-100 rounded-full p-0.5">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700">Methodology</Label>
                                <Select
                                    value={formData.methodology}
                                    onValueChange={(value) => updateField('methodology', value)}
                                >
                                    <SelectTrigger className="h-10 text-sm border-slate-200 focus:ring-emerald-500/20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-slate-200">
                                        <SelectItem value="PTES (Penetration Testing Execution Standard)" className="text-sm">PTES</SelectItem>
                                        <SelectItem value="OWASP Testing Guide v4" className="text-sm">OWASP Testing Guide v4</SelectItem>
                                        <SelectItem value="NIST SP 800-115" className="text-sm">NIST SP 800-115</SelectItem>
                                        <SelectItem value="OSSTMM" className="text-sm">OSSTMM</SelectItem>
                                        <SelectItem value="Custom Methodology" className="text-sm">Custom Methodology</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                                    Compliance Requirements
                                </Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['PCI-DSS', 'SOC2', 'HIPAA', 'GDPR', 'ISO 27001', 'FedRAMP'].map((framework) => (
                                        <button
                                            key={framework}
                                            type="button"
                                            onClick={() => toggleCompliance(framework)}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                                                formData.complianceFrameworks.includes(framework)
                                                    ? "bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200"
                                                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                                                formData.complianceFrameworks.includes(framework)
                                                    ? "bg-emerald-600 border-emerald-600"
                                                    : "border-slate-300"
                                            )}>
                                                {formData.complianceFrameworks.includes(framework) && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            {framework}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Timeline & Priority */}
                    {step === 3 && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium text-slate-700">Start Date <span className="text-red-500">*</span></Label>
                                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full h-10 justify-start text-left text-sm font-normal border-slate-200",
                                                    !formData.startDate && "text-slate-400"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                                                {formData.startDate ? format(formData.startDate, "PPP") : "Pick a date"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-white border-slate-200">
                                            <Calendar
                                                mode="single"
                                                selected={formData.startDate}
                                                onSelect={(date) => {
                                                    updateField('startDate', date)
                                                    setStartDateOpen(false)
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium text-slate-700">End Date <span className="text-red-500">*</span></Label>
                                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full h-10 justify-start text-left text-sm font-normal border-slate-200",
                                                    !formData.endDate && "text-slate-400"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                                                {formData.endDate ? format(formData.endDate, "PPP") : "Pick a date"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-white border-slate-200">
                                            <Calendar
                                                mode="single"
                                                selected={formData.endDate}
                                                onSelect={(date) => {
                                                    updateField('endDate', date)
                                                    setEndDateOpen(false)
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700">Priority Level</Label>
                                <div className="grid grid-cols-4 gap-2">
                                    {(['Low', 'Medium', 'High', 'Critical'] as const).map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => updateField('priority', p)}
                                            className={cn(
                                                "py-2.5 px-3 rounded-lg text-sm font-medium transition-all border",
                                                formData.priority === p
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 ring-2 ring-emerald-100"
                                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                            )}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700">Initial Status</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['Planning', 'In Progress', 'On Hold'] as const).map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => updateField('status', s)}
                                            className={cn(
                                                "py-2.5 px-3 rounded-lg text-sm font-medium transition-all border",
                                                formData.status === s
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 ring-2 ring-emerald-100"
                                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                            )}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Team Assignment */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-slate-400" />
                                </div>
                                <p className="text-sm font-medium text-slate-900 mb-1">
                                    Team Assignment
                                </p>
                                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                                    {editingProject 
                                        ? 'Manage team members from the project details page'
                                        : 'Assign team members after creating the project'
                                    }
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex justify-between items-center sm:justify-between mt-6 pt-4 border-t border-slate-100">
                    <div>
                        {step > 1 && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleBack}
                                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1"
                            >
                                <ChevronLeft className="h-4 w-4 shrink-0" />
                                <span>Back</span>
                            </Button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        >
                            Cancel
                        </Button>

                        {step < totalSteps ? (
                            <Button
                                type="button"
                                onClick={handleNext}
                                disabled={
                                    (step === 1 && (!formData.name || !formData.clientId)) ||
                                    (step === 3 && (!formData.startDate || !formData.endDate))
                                }
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            >
                                <span>Next</span>
                                <ChevronRight className="h-4 w-4 shrink-0" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4 shrink-0" />
                                )}
                                <span>{isSubmitting ? 'Saving...' : (editingProject ? 'Update' : 'Create')}</span>
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
