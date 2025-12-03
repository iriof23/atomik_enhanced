import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Editor } from '@/components/editor/Editor';
import { Trash2, Save, Globe, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";

// Define types locally for now, ideally should be shared
export interface ProjectFinding {
    id: string;
    owaspId: string;
    title: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
    cvssScore?: number;
    cvssVector?: string;
    status: 'Open' | 'In Progress' | 'Fixed' | 'Accepted Risk';
    description: string;
    recommendations: string;
    evidence?: string;
    affectedAssets: Array<{ url: string; description: string; instanceCount: number }>;
    screenshots: Array<{ id: string; url: string; caption: string }>;
}

interface EditFindingSheetProps {
    finding: ProjectFinding | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (finding: ProjectFinding) => void;
    onDelete: () => void;
}

export function EditFindingSheet({ finding, isOpen, onClose, onUpdate, onDelete }: EditFindingSheetProps) {
    const [localFinding, setLocalFinding] = useState<ProjectFinding | null>(finding);
    const [isDirty, setIsDirty] = useState(false);
    const [newAssetUrl, setNewAssetUrl] = useState('');

    useEffect(() => {
        setLocalFinding(finding);
        setIsDirty(false);
    }, [finding]);

    // Dirty state warning on unload
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const handleChange = (updates: Partial<ProjectFinding>) => {
        if (!localFinding) return;
        setLocalFinding(prev => prev ? ({ ...prev, ...updates }) : null);
        setIsDirty(true);
    };

    const handleSave = () => {
        if (localFinding) {
            onUpdate(localFinding);
            setIsDirty(false);
        }
    };

    const handleClose = () => {
        if (isDirty) {
            if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'Critical': return 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-sm border-0';
            case 'High': return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm border-0';
            case 'Medium': return 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm border-0';
            case 'Low': return 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm border-0';
            default: return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm border-0';
        }
    };

    const handleAddAsset = () => {
        if (!newAssetUrl.trim() || !localFinding) return;
        handleChange({
            affectedAssets: [...localFinding.affectedAssets, {
                url: newAssetUrl.trim(),
                description: '',
                instanceCount: 1
            }]
        });
        setNewAssetUrl('');
    };

    const removeAsset = (index: number) => {
        if (!localFinding) return;
        handleChange({
            affectedAssets: localFinding.affectedAssets.filter((_, i) => i !== index)
        });
    };

    if (!localFinding) return null;

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <SheetContent side="right" className="w-[90vw] sm:max-w-[90vw] p-0 overflow-hidden border-l border-zinc-800 bg-zinc-950">
                <div className="grid grid-cols-12 h-full">
                    {/* Left Panel: Metadata (Col Span 3 - 25%) */}
                    <div className="col-span-3 border-r border-zinc-800 bg-zinc-950/50 h-full overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-zinc-800">
                            <h2 className="text-lg font-semibold text-white">Finding Details</h2>
                            <p className="text-sm text-zinc-400">Manage metadata and assets</p>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-6 space-y-6">
                                {/* Title */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Title</label>
                                    <Input
                                        value={localFinding.title}
                                        onChange={(e) => handleChange({ title: e.target.value })}
                                        className="font-medium bg-zinc-900 border-zinc-800 text-white"
                                    />
                                </div>

                                {/* Severity & Status */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Severity</label>
                                        <select
                                            value={localFinding.severity}
                                            onChange={(e) => handleChange({ severity: e.target.value as any })}
                                            className="w-full px-3 py-2 text-sm border border-zinc-800 rounded-md bg-zinc-900 text-white focus:ring-2 focus:ring-primary/20 outline-none"
                                        >
                                            {['Critical', 'High', 'Medium', 'Low', 'Informational'].map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</label>
                                        <select
                                            value={localFinding.status}
                                            onChange={(e) => handleChange({ status: e.target.value as any })}
                                            className="w-full px-3 py-2 text-sm border border-zinc-800 rounded-md bg-zinc-900 text-white focus:ring-2 focus:ring-primary/20 outline-none"
                                        >
                                            {['Open', 'In Progress', 'Fixed', 'Accepted Risk'].map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* CVSS */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">CVSS Vector</label>
                                    <Input
                                        value={localFinding.cvssVector || ''}
                                        onChange={(e) => handleChange({ cvssVector: e.target.value })}
                                        className="font-mono text-xs bg-zinc-900 border-zinc-800 text-white"
                                        placeholder="CVSS:3.1/..."
                                    />
                                </div>

                                {/* Affected Assets */}
                                <div className="space-y-3">
                                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex justify-between items-center">
                                        Affected Assets
                                        <span className="text-zinc-400 font-normal normal-case">{localFinding.affectedAssets.length} items</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newAssetUrl}
                                            onChange={(e) => setNewAssetUrl(e.target.value)}
                                            placeholder="Add URL/IP..."
                                            className="text-xs bg-zinc-900 border-zinc-800 text-white"
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddAsset()}
                                        />
                                        <Button size="sm" variant="outline" onClick={handleAddAsset} disabled={!newAssetUrl.trim()} className="border-zinc-800 hover:bg-zinc-800">
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {localFinding.affectedAssets.map((asset, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 bg-zinc-900 border border-zinc-800 rounded text-sm group">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <Globe className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                                                    <span className="truncate text-zinc-300" title={asset.url}>{asset.url}</span>
                                                </div>
                                                <button
                                                    onClick={() => removeAsset(idx)}
                                                    className="text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Right Panel: Editor Canvas (Col Span 9 - 75%) */}
                    <div className="col-span-9 h-full overflow-hidden flex flex-col bg-zinc-950 relative">
                        {/* Sticky Header */}
                        <div className="flex items-center justify-between px-8 py-4 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <Badge className={cn('text-xs px-2 py-0.5', getSeverityColor(localFinding.severity))}>
                                    {localFinding.severity}
                                </Badge>
                                <span className="text-sm text-zinc-500 font-mono">{localFinding.id}</span>
                                {isDirty && <span className="text-xs text-orange-500 font-medium">• Unsaved Changes</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onDelete}
                                    className="text-red-500 hover:text-red-400 hover:bg-red-900/20"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSave}
                                    disabled={!isDirty}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleClose}
                                    className="ml-2 text-zinc-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-8 space-y-8 max-w-5xl mx-auto pb-20">
                                {/* Description */}
                                <div className="space-y-3">
                                    <h3 className="text-lg font-semibold text-zinc-100">Description</h3>
                                    <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-1">
                                        <Editor
                                            content={localFinding.description}
                                            onChange={(html) => handleChange({ description: html })}
                                            placeholder="Describe the vulnerability..."
                                            className="min-h-[150px] prose-invert"
                                        />
                                    </div>
                                </div>

                                {/* Evidence - Dominant Element */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-zinc-100">Proof of Concept & Evidence</h3>
                                        <Badge variant="outline" className="text-zinc-500 border-zinc-700">Evidence</Badge>
                                    </div>
                                    <div className="p-1 bg-zinc-900/50 rounded-xl border border-zinc-800 min-h-[500px]">
                                        <Editor
                                            content={localFinding.evidence || ''}
                                            onChange={(html) => handleChange({ evidence: html })}
                                            placeholder="Drag & drop screenshots, paste code snippets, or write your PoC here..."
                                            variant="evidence"
                                            className="min-h-[500px] border-none shadow-none focus-within:ring-0 prose-invert"
                                        />
                                    </div>
                                </div>

                                {/* Remediation */}
                                <div className="space-y-3">
                                    <h3 className="text-lg font-semibold text-zinc-100">Remediation</h3>
                                    <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-1">
                                        <Editor
                                            content={localFinding.recommendations}
                                            onChange={(html) => handleChange({ recommendations: html })}
                                            placeholder="How to fix this issue..."
                                            className="min-h-[150px] prose-invert"
                                        />
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
