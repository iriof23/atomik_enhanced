import React, { useState, useEffect, KeyboardEvent } from 'react'
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
import {
    Building2,
    Mail,
    Phone,
    Tag,
    Briefcase,
    Check,
    ChevronRight,
    ChevronLeft,
    X,
    Loader2,
    Target,
    Zap,
    PauseCircle,
    Layers,
    TrendingUp,
    Award,
    AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'

interface AddClientDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onClientAdded?: (client: any) => void
    editingClient?: any
}

// Suggested tags for quick adding
const SUGGESTED_TAGS = ['PCI-DSS', 'SOC2', 'HIPAA', 'ISO27001', 'GDPR', 'Finance', 'Healthcare', 'Tech']

export function AddClientDialog({ open, onOpenChange, onClientAdded, editingClient }: AddClientDialogProps) {
    const { getToken } = useAuth()
    const { toast } = useToast()
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward'>('forward')
    const [isAnimating, setIsAnimating] = useState(false)
    const [formData, setFormData] = useState({
        // Basic Info
        name: '',
        industry: '',
        companySize: 'SMB' as 'Enterprise' | 'SMB' | 'Startup',
        logoUrl: '',

        // Contact Info
        primaryContact: '',
        email: '',
        phone: '',

        // Classification
        status: 'Prospect' as 'Active' | 'Inactive' | 'Prospect' | 'Archived',
        serviceTier: 'Standard' as 'Standard' | 'Priority' | 'Strategic',
        tags: [] as string[],

        // Additional
        notes: ''
    })

    const [tagInput, setTagInput] = useState('')

    // Populate form when editing
    useEffect(() => {
        if (editingClient && open) {
            setFormData({
                name: editingClient.name || '',
                industry: editingClient.industry || '',
                companySize: editingClient.companySize || 'SMB',
                logoUrl: editingClient.logoUrl || '',
                primaryContact: editingClient.primaryContact || '',
                email: editingClient.email || '',
                phone: editingClient.phone || '',
                status: editingClient.status || 'Prospect',
                serviceTier: editingClient.serviceTier || editingClient.riskLevel || 'Standard',
                tags: editingClient.tags || [],
                notes: editingClient.notes || ''
            })
        } else if (!editingClient && open) {
            // Reset form when adding new client
            setFormData({
                name: '',
                industry: '',
                companySize: 'SMB',
                logoUrl: '',
                primaryContact: '',
                email: '',
                phone: '',
                status: 'Prospect',
                serviceTier: 'Standard',
                tags: [],
                notes: ''
            })
        }
    }, [editingClient, open])

    const totalSteps = 3
    const stepLabels = ['Basic Info', 'Contact', 'Classification']

    // Validation per step
    const isStep1Valid = formData.name.trim().length > 0
    const isStep2Valid = formData.primaryContact.trim().length > 0 && formData.email.trim().length > 0 && formData.email.includes('@')
    const isStep3Valid = true // No required fields

    const canProceed = () => {
        if (step === 1) return isStep1Valid
        if (step === 2) return isStep2Valid
        return true
    }

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addTag()
        } else if (e.key === 'Backspace' && tagInput === '' && formData.tags.length > 0) {
            removeTag(formData.tags[formData.tags.length - 1])
        }
    }

    const addTag = (tagToAdd?: string) => {
        const tag = (tagToAdd || tagInput).trim().replace(/,/g, '')
        if (tag && !formData.tags.includes(tag)) {
            updateField('tags', [...formData.tags, tag])
            setTagInput('')
        }
    }

    const removeTag = (tag: string) => {
        updateField('tags', formData.tags.filter(t => t !== tag))
    }

    const handleNext = () => {
        if (step < totalSteps && canProceed()) {
            setAnimationDirection('forward')
            setIsAnimating(true)
            setTimeout(() => {
                setStep(step + 1)
                setTimeout(() => setIsAnimating(false), 50)
            }, 150)
        }
    }

    const handleBack = () => {
        if (step > 1) {
            setAnimationDirection('backward')
            setIsAnimating(true)
            setTimeout(() => {
                setStep(step - 1)
                setTimeout(() => setIsAnimating(false), 50)
            }, 150)
        }
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

            const payload: Record<string, any> = {
                name: formData.name.trim(),
            }
            
            if (formData.primaryContact?.trim()) {
                payload.contact_name = formData.primaryContact.trim()
            }
            if (formData.email?.trim()) {
                payload.contact_email = formData.email.trim()
            }
            if (formData.phone?.trim()) {
                payload.contact_phone = formData.phone.trim()
            }
            if (formData.industry?.trim()) {
                payload.industry = formData.industry.trim()
            }
            if (formData.companySize) {
                payload.company_size = formData.companySize
            }
            if (formData.logoUrl?.trim()) {
                payload.website_url = formData.logoUrl.trim()
            }
            if (formData.status) {
                payload.status = formData.status
            }
            if (formData.serviceTier) {
                payload.risk_level = formData.serviceTier
            }
            if (formData.tags.length > 0) {
                payload.tags = JSON.stringify(formData.tags)
            }
            if (formData.notes?.trim()) {
                payload.notes = formData.notes.trim()
            }

            let clientData
            if (editingClient) {
                const response = await api.put(`/clients/${editingClient.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                clientData = response.data
                toast({
                    title: 'Client Updated',
                    description: `${clientData.name} has been updated successfully.`,
                })
            } else {
                const response = await api.post('/clients/', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                clientData = response.data
                toast({
                    title: 'Client Created',
                    description: `${clientData.name} has been created successfully.`,
                })
            }

            const frontendClientData = {
                id: clientData.id,
                name: clientData.name,
                logoUrl: formData.logoUrl || '',
                status: formData.status,
                serviceTier: formData.serviceTier,
                riskLevel: formData.serviceTier,
                industry: formData.industry,
                companySize: formData.companySize,
                primaryContact: clientData.contact_name || formData.primaryContact,
                email: clientData.contact_email || formData.email,
                phone: clientData.contact_phone || formData.phone,
                tags: formData.tags,
                notes: formData.notes || '',
                lastActivity: 'Just now',
                lastActivityDate: new Date(),
                projectsCount: 0,
                reportsCount: 0,
                totalFindings: 0,
                findingsBySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
                createdAt: new Date(clientData.created_at),
                updatedAt: new Date(clientData.updated_at),
            }

            onClientAdded?.(frontendClientData)
            onOpenChange(false)

            setStep(1)
            setFormData({
                name: '',
                industry: '',
                companySize: 'SMB',
                logoUrl: '',
                primaryContact: '',
                email: '',
                phone: '',
                status: 'Prospect',
                serviceTier: 'Standard',
                tags: [],
                notes: ''
            })
        } catch (error: any) {
            console.error('Failed to create/update client:', error)
            toast({
                title: 'Error',
                description: error.response?.data?.detail || 'Failed to save client. Please try again.',
                variant: 'destructive',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Status options with professional icons
    const statusOptions = [
        { value: 'Prospect', label: 'Prospect', icon: Target },
        { value: 'Active', label: 'Active', icon: Zap },
        { value: 'Inactive', label: 'Inactive', icon: PauseCircle },
    ] as const

    // Service Tier options with professional icons
    const tierOptions = [
        { value: 'Standard', label: 'Standard', icon: Layers },
        { value: 'Priority', label: 'Priority', icon: TrendingUp },
        { value: 'Strategic', label: 'Strategic', icon: Award },
    ] as const

    // Available suggested tags (not already added)
    const availableSuggestions = SUGGESTED_TAGS.filter(tag => !formData.tags.includes(tag))

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto bg-white border-slate-200 rounded-2xl shadow-2xl p-0">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-3">
                    <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2.5">
                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-sm">
                            <Building2 className="h-4 w-4 text-white" />
                        </div>
                        {editingClient ? 'Edit Client' : 'Add Client'}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500 mt-1">
                        {editingClient 
                            ? <span>Editing: <span className="font-medium text-slate-700">{editingClient.name}</span></span>
                            : 'Create a new client organization'
                        }
                    </DialogDescription>
                </DialogHeader>

                {/* Apple-Style Stepper */}
                <div className="px-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-sm">
                        {stepLabels.map((label, idx) => (
                            <React.Fragment key={label}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (idx + 1 < step) {
                                            setAnimationDirection('backward')
                                            setIsAnimating(true)
                                            setTimeout(() => {
                                                setStep(idx + 1)
                                                setTimeout(() => setIsAnimating(false), 50)
                                            }, 150)
                                        }
                                    }}
                                    className={cn(
                                        "transition-colors",
                                        step === idx + 1 
                                            ? "text-slate-900 font-semibold" 
                                            : step > idx + 1
                                                ? "text-emerald-600 font-medium cursor-pointer hover:text-emerald-700"
                                                : "text-slate-400"
                                    )}
                                >
                                    {step > idx + 1 && (
                                        <Check className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />
                                    )}
                                    {label}
                                </button>
                                {idx < stepLabels.length - 1 && (
                                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                        Step {step} of {totalSteps}
                    </p>
                </div>

                {/* Form Content with Animation */}
                <div className={cn(
                    "px-6 py-5 transition-all duration-200 ease-out",
                    isAnimating && animationDirection === 'forward' && "opacity-0 translate-x-4",
                    isAnimating && animationDirection === 'backward' && "opacity-0 -translate-x-4",
                    !isAnimating && "opacity-100 translate-x-0"
                )}>
                    {/* Step 1: Basic Information */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="name" className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                                    Company Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Acme Corporation"
                                    value={formData.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    className={cn(
                                        "h-10 text-sm border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-lg",
                                        formData.name && "border-emerald-200 bg-emerald-50/30"
                                    )}
                                    autoFocus
                                />
                                {!isStep1Valid && (
                                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Required to continue
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="industry" className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                                        Industry
                                    </Label>
                                    <Input
                                        id="industry"
                                        placeholder="e.g., Financial Services"
                                        value={formData.industry}
                                        onChange={(e) => updateField('industry', e.target.value)}
                                        className="h-10 text-sm border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-lg"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="companySize" className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                                        Size
                                    </Label>
                                    <select
                                        id="companySize"
                                        value={formData.companySize}
                                        onChange={(e) => updateField('companySize', e.target.value)}
                                        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                                    >
                                        <option value="Startup">Startup (1-50)</option>
                                        <option value="SMB">SMB (51-500)</option>
                                        <option value="Enterprise">Enterprise (500+)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="logoUrl" className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                                    Website
                                </Label>
                                <Input
                                    id="logoUrl"
                                    placeholder="https://client-company.com"
                                    value={formData.logoUrl}
                                    onChange={(e) => updateField('logoUrl', e.target.value)}
                                    className="h-10 text-sm border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-lg"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Contact Information */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="primaryContact" className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                                    Primary Contact <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="primaryContact"
                                    placeholder="e.g., John Smith"
                                    value={formData.primaryContact}
                                    onChange={(e) => updateField('primaryContact', e.target.value)}
                                    className={cn(
                                        "h-10 text-sm border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-lg",
                                        formData.primaryContact && "border-emerald-200 bg-emerald-50/30"
                                    )}
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                                        Email <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="john@company.com"
                                            value={formData.email}
                                            onChange={(e) => updateField('email', e.target.value)}
                                            className={cn(
                                                "h-10 text-sm pl-9 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-lg",
                                                formData.email && formData.email.includes('@') && "border-emerald-200 bg-emerald-50/30"
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="phone" className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                                        Phone
                                    </Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder="+1 (555) 123-4567"
                                            value={formData.phone}
                                            onChange={(e) => updateField('phone', e.target.value)}
                                            className="h-10 text-sm pl-9 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-lg"
                                        />
                                    </div>
                                </div>
                            </div>

                            {!isStep2Valid && (
                                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Contact name and valid email required
                                </p>
                            )}

                            <div className="space-y-1.5">
                                <Label htmlFor="notes" className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                                    Notes
                                </Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Additional information..."
                                    value={formData.notes}
                                    onChange={(e) => updateField('notes', e.target.value)}
                                    rows={2}
                                    className="text-sm border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none rounded-lg"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Classification */}
                    {step === 3 && (
                        <div className="space-y-5">
                            {/* Client Status - Compact Cards */}
                            <div className="space-y-2">
                                <Label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Briefcase className="h-3 w-3" />
                                    Client Status
                                </Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {statusOptions.map((option) => {
                                        const Icon = option.icon
                                        const isSelected = formData.status === option.value
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => updateField('status', option.value)}
                                                className={cn(
                                                    "relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border transition-all",
                                                    isSelected
                                                        ? "border-emerald-500 bg-emerald-50 shadow-sm"
                                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                                )}
                                            >
                                                {isSelected && (
                                                    <div className="absolute top-1.5 right-1.5">
                                                        <Check className="h-3 w-3 text-emerald-600" />
                                                    </div>
                                                )}
                                                <Icon className={cn(
                                                    "h-4 w-4",
                                                    isSelected ? "text-emerald-600" : "text-slate-400"
                                                )} />
                                                <span className={cn(
                                                    "text-xs font-medium",
                                                    isSelected ? "text-emerald-700" : "text-slate-600"
                                                )}>
                                                    {option.label}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Service Tier - Compact Cards */}
                            <div className="space-y-2">
                                <Label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Award className="h-3 w-3" />
                                    Service Tier
                                </Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {tierOptions.map((option) => {
                                        const Icon = option.icon
                                        const isSelected = formData.serviceTier === option.value
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => updateField('serviceTier', option.value)}
                                                className={cn(
                                                    "relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border transition-all",
                                                    isSelected
                                                        ? "border-emerald-500 bg-emerald-50 shadow-sm"
                                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                                )}
                                            >
                                                {isSelected && (
                                                    <div className="absolute top-1.5 right-1.5">
                                                        <Check className="h-3 w-3 text-emerald-600" />
                                                    </div>
                                                )}
                                                <Icon className={cn(
                                                    "h-4 w-4",
                                                    isSelected ? "text-emerald-600" : "text-slate-400"
                                                )} />
                                                <span className={cn(
                                                    "text-xs font-medium",
                                                    isSelected ? "text-emerald-700" : "text-slate-600"
                                                )}>
                                                    {option.label}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Tags with Quick Add Suggestions */}
                            <div className="space-y-2">
                                <Label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Tag className="h-3 w-3" />
                                    Tags
                                </Label>
                                
                                {/* Quick Add Suggestions */}
                                {availableSuggestions.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {availableSuggestions.slice(0, 6).map((tag) => (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => addTag(tag)}
                                                className="px-2 py-0.5 text-[10px] font-medium rounded-md border border-dashed border-slate-300 text-slate-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                            >
                                                + {tag}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Tag Input */}
                                <div className={cn(
                                    "flex flex-wrap items-center gap-1.5 p-2 min-h-[40px] rounded-lg border transition-colors",
                                    "border-slate-200 bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20"
                                )}>
                                    {formData.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-700"
                                        >
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                                className="hover:bg-emerald-200 rounded-full p-0.5 transition-colors"
                                            >
                                                <X className="h-2.5 w-2.5" />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        type="text"
                                        placeholder={formData.tags.length === 0 ? "Type and press Enter..." : ""}
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={handleTagKeyDown}
                                        onBlur={() => { if (tagInput.trim()) addTag() }}
                                        className="flex-1 min-w-[80px] text-sm bg-transparent border-0 outline-none placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                            <p className="text-[11px] text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                                Almost done — review and create your client.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <DialogFooter className="px-6 py-3 bg-slate-50/80 border-t border-slate-100 rounded-b-2xl">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex gap-2">
                            {step > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleBack}
                                    className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-9 gap-1"
                                >
                                    <ChevronLeft className="h-4 w-4 shrink-0" />
                                    <span>Back</span>
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onOpenChange(false)}
                                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-9"
                            >
                                Cancel
                            </Button>
                        </div>

                        <div>
                            {step < totalSteps ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleNext}
                                    disabled={!canProceed()}
                                    className={cn(
                                        "h-9 shadow-sm transition-all gap-1",
                                        canProceed()
                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                    )}
                                >
                                    <span>Next</span>
                                    <ChevronRight className="h-4 w-4 shrink-0" />
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 shadow-sm gap-2"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4 shrink-0" />
                                    )}
                                    <span>{isSubmitting ? 'Saving...' : (editingClient ? 'Update' : 'Create')}</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
