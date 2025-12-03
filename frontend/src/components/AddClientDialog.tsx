import React, { useState, useEffect } from 'react'
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
    Building2,
    User,
    Mail,
    Phone,
    Tag,
    Shield,
    Briefcase,
    Check,
    ChevronRight,
    ChevronLeft,
    X,
    Loader2
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

export function AddClientDialog({ open, onOpenChange, onClientAdded, editingClient }: AddClientDialogProps) {
    const { getToken } = useAuth()
    const { toast } = useToast()
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
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
        riskLevel: 'Medium' as 'High' | 'Medium' | 'Low',
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
                riskLevel: editingClient.riskLevel || 'Medium',
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
                riskLevel: 'Medium',
                tags: [],
                notes: ''
            })
        }
    }, [editingClient, open])

    const totalSteps = 3
    const stepLabels = ['Basic Info', 'Contact', 'Classification']

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const addTag = () => {
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            updateField('tags', [...formData.tags, tagInput.trim()])
            setTagInput('')
        }
    }

    const removeTag = (tag: string) => {
        updateField('tags', formData.tags.filter(t => t !== tag))
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

            // Map form data to API expected format (snake_case)
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
            if (formData.riskLevel) {
                payload.risk_level = formData.riskLevel
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
                riskLevel: formData.riskLevel,
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
                riskLevel: 'Medium',
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto bg-white border-slate-200">
                <DialogHeader className="pb-4">
                    <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <Building2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        {editingClient ? 'Edit Client' : 'Add Client'}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500">
                        {editingClient 
                            ? 'Update client organization details'
                            : 'Create a new client organization to start tracking projects'
                        }
                    </DialogDescription>
                </DialogHeader>

                {/* Premium Step Indicator */}
                <div className="flex items-center justify-between mb-6 px-2">
                    {[1, 2, 3].map((s, idx) => (
                        <React.Fragment key={s}>
                            <div className="flex flex-col items-center">
                                <div
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
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
                                    "h-px flex-1 mx-3 transition-all",
                                    step > s ? "bg-emerald-600" : "bg-slate-200"
                                )} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Step 1: Basic Information */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="name" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                                Company Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                placeholder="e.g., Acme Corporation"
                                value={formData.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                className="h-10 text-sm border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="industry" className="text-sm font-medium text-slate-700">Industry</Label>
                                <Input
                                    id="industry"
                                    placeholder="e.g., Financial Services"
                                    value={formData.industry}
                                    onChange={(e) => updateField('industry', e.target.value)}
                                    className="h-10 text-sm border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="companySize" className="text-sm font-medium text-slate-700">Company Size</Label>
                                <select
                                    id="companySize"
                                    value={formData.companySize}
                                    onChange={(e) => updateField('companySize', e.target.value)}
                                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                >
                                    <option value="Startup">Startup (1-50)</option>
                                    <option value="SMB">SMB (51-500)</option>
                                    <option value="Enterprise">Enterprise (500+)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="logoUrl" className="text-sm font-medium text-slate-700">
                                Client URL (optional)
                            </Label>
                            <Input
                                id="logoUrl"
                                placeholder="https://client-company.com"
                                value={formData.logoUrl}
                                onChange={(e) => updateField('logoUrl', e.target.value)}
                                className="h-10 text-sm border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                            />
                            <p className="text-xs text-slate-500">
                                Enter the client's website URL
                            </p>
                        </div>
                    </div>
                )}

                {/* Step 2: Contact Information */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="primaryContact" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-emerald-600" />
                                Primary Contact <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="primaryContact"
                                placeholder="e.g., John Smith"
                                value={formData.primaryContact}
                                onChange={(e) => updateField('primaryContact', e.target.value)}
                                className="h-10 text-sm border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5 text-emerald-600" />
                                Email Address <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="john@company.com"
                                value={formData.email}
                                onChange={(e) => updateField('email', e.target.value)}
                                className="h-10 text-sm border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="phone" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-slate-400" />
                                Phone Number
                            </Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="+1 (555) 123-4567"
                                value={formData.phone}
                                onChange={(e) => updateField('phone', e.target.value)}
                                className="h-10 text-sm border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="notes" className="text-sm font-medium text-slate-700">Notes</Label>
                            <Textarea
                                id="notes"
                                placeholder="Additional information about the client..."
                                value={formData.notes}
                                onChange={(e) => updateField('notes', e.target.value)}
                                rows={3}
                                className="text-sm border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 resize-none"
                            />
                        </div>
                    </div>
                )}

                {/* Step 3: Classification */}
                {step === 3 && (
                    <div className="space-y-5">
                        <div className="space-y-2.5">
                            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                                Client Status
                            </Label>
                            <div className="flex flex-wrap gap-2">
                                {(['Prospect', 'Active', 'Inactive'] as const).map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => updateField('status', status)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                                            formData.status === status
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 ring-2 ring-emerald-100"
                                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                        )}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Shield className="h-3.5 w-3.5 text-slate-400" />
                                Risk Level
                            </Label>
                            <div className="flex gap-2">
                                {(['Low', 'Medium', 'High'] as const).map((risk) => (
                                    <button
                                        key={risk}
                                        type="button"
                                        onClick={() => updateField('riskLevel', risk)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                                            formData.riskLevel === risk
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 ring-2 ring-emerald-100"
                                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                        )}
                                    >
                                        {risk}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="tags" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Tag className="h-3.5 w-3.5 text-slate-400" />
                                Tags
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    id="tags"
                                    placeholder="Add a tag (e.g., PCI, SOC2)"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                    className="h-10 text-sm border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                                />
                                <Button 
                                    type="button" 
                                    onClick={addTag} 
                                    variant="outline"
                                    size="sm"
                                    className="h-10 px-4 border-slate-200 text-slate-600 hover:bg-slate-50"
                                >
                                    Add
                                </Button>
                            </div>
                            {formData.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {formData.tags.map((tag) => (
                                        <Badge
                                            key={tag}
                                            variant="secondary"
                                            className="gap-1 pl-2.5 pr-1.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        >
                                            #{tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                                className="hover:bg-slate-300 rounded-full p-0.5 transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter className="flex justify-between items-center sm:justify-between mt-6 pt-4 border-t border-slate-100">
                    <div>
                        {step > 1 && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleBack}
                                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Back
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
                                disabled={!formData.name}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={!formData.name || !formData.primaryContact || !formData.email || isSubmitting}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4 mr-2" />
                                )}
                                {isSubmitting ? 'Saving...' : (editingClient ? 'Update' : 'Create')}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
