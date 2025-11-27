import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Editor } from '@/components/editor/Editor'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface AddFindingDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onFindingAdded: (finding: any) => void
}

export function AddFindingDialog({ open, onOpenChange, onFindingAdded }: AddFindingDialogProps) {
    const [formData, setFormData] = useState({
        title: '',
        severity: 'Medium',
        category: 'Web',
        description: '',
        remediation: '',
        evidence: '',
        owasp_reference: ''
    })

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            setFormData({
                title: '',
                severity: 'Medium',
                category: 'Web',
                description: '',
                remediation: '',
                evidence: '',
                owasp_reference: ''
            })
        }
    }, [open])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const newFinding = {
            id: `custom-${Date.now()}`,
            ...formData
        }

        onFindingAdded(newFinding)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
                <div className="px-6 pt-6 pb-4 border-b">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Add Custom Finding</DialogTitle>
                        <DialogDescription className="mt-1.5">
                            Create a new vulnerability finding to add to your database.
                        </DialogDescription>
                    </DialogHeader>
                </div>
                
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 custom-scrollbar">
                        {/* Basic Information */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. SQL Injection"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="owasp">OWASP Reference</Label>
                                <Input
                                    id="owasp"
                                    value={formData.owasp_reference}
                                    onChange={(e) => setFormData({ ...formData, owasp_reference: e.target.value })}
                                    placeholder="e.g. A03:2021-Injection"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="severity">Severity</Label>
                                <Select
                                    value={formData.severity}
                                    onValueChange={(value) => setFormData({ ...formData, severity: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select severity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Critical">Critical</SelectItem>
                                        <SelectItem value="High">High</SelectItem>
                                        <SelectItem value="Medium">Medium</SelectItem>
                                        <SelectItem value="Low">Low</SelectItem>
                                        <SelectItem value="Info">Info</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Web">Web</SelectItem>
                                        <SelectItem value="Mobile">Mobile</SelectItem>
                                        <SelectItem value="Network">Network</SelectItem>
                                        <SelectItem value="Cloud">Cloud</SelectItem>
                                        <SelectItem value="Database">Database</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Collapsible Sections */}
                        <Accordion type="multiple" defaultValue={['description', 'evidence', 'remediation']} className="space-y-3">
                            {/* Description */}
                            <AccordionItem value="description" className="border border-border bg-card rounded-lg overflow-hidden">
                                <AccordionTrigger className="px-4 py-3 hover:bg-accent transition-colors font-medium text-foreground">
                                    Description
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4 pt-2">
                                    <Editor
                                        content={formData.description}
                                        onChange={(html) => setFormData({ ...formData, description: html })}
                                        placeholder="Detailed description of the vulnerability..."
                                        className="min-h-[120px]"
                                    />
                                </AccordionContent>
                            </AccordionItem>

                            {/* Proof of Concept & Evidence */}
                            <AccordionItem value="evidence" className="border border-border bg-card rounded-lg overflow-hidden">
                                <AccordionTrigger className="px-4 py-3 hover:bg-accent transition-colors font-medium text-foreground">
                                    Proof of Concept & Evidence
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4 pt-2">
                                    <Editor
                                        content={formData.evidence}
                                        onChange={(html) => setFormData({ ...formData, evidence: html })}
                                        placeholder="Provide proof of concept, screenshots, code snippets..."
                                        className="min-h-[200px]"
                                    />
                                </AccordionContent>
                            </AccordionItem>
                            
                            {/* Remediation */}
                            <AccordionItem value="remediation" className="border border-border bg-card rounded-lg overflow-hidden">
                                <AccordionTrigger className="px-4 py-3 hover:bg-accent transition-colors font-medium text-foreground">
                                    Remediation
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4 pt-2">
                                    <Editor
                                        content={formData.remediation}
                                        onChange={(html) => setFormData({ ...formData, remediation: html })}
                                        placeholder="Steps to fix or mitigate the issue..."
                                        className="min-h-[120px]"
                                    />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>

                    <div className="sticky bottom-0 px-6 py-4 bg-background border-t mt-auto">
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Add Finding</Button>
                        </DialogFooter>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
