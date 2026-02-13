/**
 * Compact Prompts panel for the Story Editor sidebar Sheet.
 * Lists prompts grouped by type as collapsible items.
 * Expanding a prompt shows the PromptForm inline for editing.
 */
import { useEffect, useState } from 'react';
import { usePromptStore } from '../store/promptStore';
import { PromptForm } from './PromptForm';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, Plus, Trash2, Copy, X } from 'lucide-react';
import { toast } from 'react-toastify';
import type { Prompt } from '@/types/story';
import { cn } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const PROMPT_TYPE_LABELS: Record<string, string> = {
    scene_beat: 'Scene Beat',
    gen_summary: 'Generate Summary',
    selection_specific: 'Selection-Specific',
    continue_writing: 'Continue Writing',
    brainstorm: 'Brainstorm',
    other: 'Other',
};

export function PromptsPanel() {
    const { prompts, fetchPrompts, deletePrompt, clonePrompt } = usePromptStore();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showNewForm, setShowNewForm] = useState(false);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchPrompts();
    }, []);

    // Group prompts by type
    const grouped = prompts.reduce<Record<string, Prompt[]>>((acc, prompt) => {
        const type = prompt.promptType || 'other';
        if (!acc[type]) acc[type] = [];
        acc[type].push(prompt);
        return acc;
    }, {});

    const toggleGroup = (type: string) => {
        setOpenGroups(prev => ({ ...prev, [type]: !prev[type] }));
    };

    const handleSave = () => {
        setExpandedId(null);
        setShowNewForm(false);
        fetchPrompts();
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await deletePrompt(id);
        if (expandedId === id) setExpandedId(null);
        toast.success('Prompt deleted');
    };

    const handleClone = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await clonePrompt(id);
        toast.success('Prompt cloned');
    };

    return (
        <div className="space-y-3">
            {/* New Prompt Button */}
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{prompts.length} prompt{prompts.length !== 1 ? 's' : ''}</span>
                <Button
                    variant={showNewForm ? "secondary" : "default"}
                    size="sm"
                    onClick={() => {
                        setShowNewForm(!showNewForm);
                        setExpandedId(null);
                    }}
                >
                    {showNewForm ? (
                        <><X className="h-3 w-3 mr-1" /> Cancel</>
                    ) : (
                        <><Plus className="h-3 w-3 mr-1" /> New Prompt</>
                    )}
                </Button>
            </div>

            {/* New Prompt Form */}
            {showNewForm && (
                <div className="border rounded-lg p-3 bg-muted/30">
                    <h4 className="text-sm font-medium mb-3">Create New Prompt</h4>
                    <PromptForm
                        onSave={handleSave}
                        onCancel={() => setShowNewForm(false)}
                    />
                </div>
            )}

            {/* Grouped Prompt List */}
            {Object.entries(grouped).map(([type, typePrompts]) => (
                <Collapsible
                    key={type}
                    open={openGroups[type] !== false} // default open
                    onOpenChange={() => toggleGroup(type)}
                >
                    <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
                        <ChevronRight className={cn(
                            "h-3.5 w-3.5 transition-transform flex-shrink-0",
                            openGroups[type] !== false && "rotate-90"
                        )} />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {PROMPT_TYPE_LABELS[type] || type}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                            {typePrompts.length}
                        </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 mt-1">
                        {typePrompts.map(prompt => (
                            <PromptItem
                                key={prompt.id}
                                prompt={prompt}
                                isExpanded={expandedId === prompt.id}
                                onToggle={() => {
                                    setExpandedId(expandedId === prompt.id ? null : prompt.id);
                                    setShowNewForm(false);
                                }}
                                onSave={handleSave}
                                onDelete={handleDelete}
                                onClone={handleClone}
                            />
                        ))}
                    </CollapsibleContent>
                </Collapsible>
            ))}

            {prompts.length === 0 && !showNewForm && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                    No prompts yet. Click "New Prompt" to create one.
                </div>
            )}
        </div>
    );
}

// ── Prompt Item ────────────────────────────────────────────────

function PromptItem({
    prompt,
    isExpanded,
    onToggle,
    onSave,
    onDelete,
    onClone,
}: {
    prompt: Prompt;
    isExpanded: boolean;
    onToggle: () => void;
    onSave: () => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
    onClone: (e: React.MouseEvent, id: string) => void;
}) {
    return (
        <div className={cn(
            "border rounded-lg transition-colors",
            isExpanded ? "bg-muted/20 border-primary/30" : "hover:bg-muted/30"
        )}>
            {/* Header row */}
            <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                onClick={onToggle}
            >
                <ChevronRight className={cn(
                    "h-3.5 w-3.5 transition-transform flex-shrink-0 text-muted-foreground",
                    isExpanded && "rotate-90"
                )} />
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{prompt.name}</div>
                    {prompt.description && (
                        <div className="text-xs text-muted-foreground truncate">{prompt.description}</div>
                    )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {prompt.isSystem && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                            System
                        </span>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => onClone(e, prompt.id!)}
                        title="Clone prompt"
                    >
                        <Copy className="h-3 w-3" />
                    </Button>
                    {!prompt.isSystem && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Delete prompt"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Prompt</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to delete "{prompt.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={(e) => onDelete(e, prompt.id!)}
                                    >
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </div>

            {/* Expanded: PromptForm */}
            {isExpanded && (
                <div className="px-3 pb-3 border-t">
                    <div className="pt-3">
                        <PromptForm
                            prompt={prompt}
                            onSave={onSave}
                            onCancel={onToggle}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
