import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { PromptForm } from './PromptForm';
import { PromptsList } from './PromptList';
import { Plus, ArrowLeft, RefreshCw, Menu } from 'lucide-react';
import { Upload, Download } from 'lucide-react';
import type { Prompt } from '@/types/story';
import { cn } from '@/lib/utils';
import { toast } from 'react-toastify';
import { dbSeeder } from '@/services/dbSeed';
import { usePromptStore } from '../store/promptStore';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

export function PromptsManager() {
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>(undefined);
    const [isCreating, setIsCreating] = useState(false);
    const [showMobileForm, setShowMobileForm] = useState(false);
    const [mobileListOpen, setMobileListOpen] = useState(false);
    const [isReseeding, setIsReseeding] = useState(false);
    const { fetchPrompts } = usePromptStore();
    const { exportPrompts, importPrompts } = usePromptStore();
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useState<HTMLInputElement | null>(null);
    const isMobile = useIsMobile();

    const handleNewPrompt = () => {
        setSelectedPrompt(undefined);
        setIsCreating(true);
        setShowMobileForm(true);
        setMobileListOpen(false);
    };

    const handlePromptSelect = (prompt: Prompt) => {
        setSelectedPrompt(prompt);
        setIsCreating(false);
        setShowMobileForm(true);
        setMobileListOpen(false);
    };

    const handleBack = () => {
        setShowMobileForm(false);
        if (!selectedPrompt) {
            setIsCreating(false);
        }
    };

    const handleSave = () => {
        setShowMobileForm(false);
    };

    const handlePromptDelete = (promptId: string) => {
        if (selectedPrompt?.id === promptId) {
            setSelectedPrompt(undefined);
            setIsCreating(false);
        }
    };

    const handleReseedSystemPrompts = async () => {
        try {
            setIsReseeding(true);
            await dbSeeder.forceReseedSystemPrompts();
            await fetchPrompts();
            toast.success('System prompts reseeded successfully');
        } catch (error) {
            toast.error('Failed to reseed system prompts');
            console.error('Error reseeding system prompts:', error);
        } finally {
            setIsReseeding(false);
        }
    };

    // Sidebar content (shared between desktop sidebar and mobile sheet)
    const sidebarContent = (
        <>
            <div className="p-4 border-b border-input">
                <div className="flex gap-2 flex-wrap">
                    <Button
                        onClick={handleNewPrompt}
                        className="flex-1 flex items-center gap-2 min-w-[120px]"
                    >
                        <Plus className="h-4 w-4" />
                        New Prompt
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={async () => {
                                try {
                                    const isSaved = await exportPrompts();
                                    if (isSaved) {
                                        toast.success('Prompts exported');
                                    }
                                } catch (error) {
                                    console.error('Export failed', error);
                                    toast.error('Failed to export prompts');
                                }
                            }}
                            title="Export prompts"
                        >
                            <Upload className="h-4 w-4" />
                        </Button>

                        <input
                            type="file"
                            accept="application/json"
                            style={{ display: 'none' }}
                            ref={el => {
                                // maintain ref in state to avoid using useRef for simplicity
                                // @ts-ignore
                                fileInputRef[1](el);
                            }}
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setIsImporting(true);
                                try {
                                    const text = await file.text();
                                    await importPrompts(text);
                                    await fetchPrompts();
                                    toast.success('Prompts imported successfully');
                                } catch (error) {
                                    console.error('Import failed', error);
                                    toast.error('Failed to import prompts');
                                } finally {
                                    setIsImporting(false);
                                    // clear the input so the same file can be reselected if needed
                                    // @ts-ignore
                                    if (fileInputRef[0]) fileInputRef[0].value = '';
                                }
                            }}
                        />

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                                // @ts-ignore
                                if (fileInputRef[0]) fileInputRef[0].click();
                            }}
                            disabled={isImporting}
                            title="Import prompts"
                        >
                            <Download className={cn("h-4 w-4", isImporting && "animate-spin")} />
                        </Button>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleReseedSystemPrompts}
                            disabled={isReseeding}
                            title="Reseed system prompts"
                        >
                            <RefreshCw className={cn("h-4 w-4", isReseeding && "animate-spin")} />
                        </Button>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                <PromptsList
                    onPromptSelect={handlePromptSelect}
                    selectedPromptId={selectedPrompt?.id}
                    onPromptDelete={handlePromptDelete}
                />
            </div>
        </>
    );

    // Mobile layout
    if (isMobile) {
        return (
            <div className="flex flex-col h-full">
                {/* Mobile Header */}
                <div className="h-14 border-b flex items-center px-4 gap-3 flex-shrink-0">
                    {showMobileForm ? (
                        <Button variant="ghost" size="icon" onClick={handleBack}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    ) : (
                        <Button variant="ghost" size="icon" onClick={() => setMobileListOpen(true)}>
                            <Menu className="h-5 w-5" />
                        </Button>
                    )}
                    <span className="font-semibold">
                        {showMobileForm
                            ? (selectedPrompt ? 'Edit Prompt' : 'New Prompt')
                            : 'Prompts'
                        }
                    </span>
                </div>

                {/* Mobile List Sheet */}
                <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
                    <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
                        <SheetHeader className="p-4 border-b">
                            <SheetTitle>Prompts</SheetTitle>
                        </SheetHeader>
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {sidebarContent}
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Mobile Content */}
                <div className="flex-1 overflow-auto p-4">
                    {(isCreating || selectedPrompt) ? (
                        <PromptForm
                            key={selectedPrompt?.id || 'new'}
                            prompt={selectedPrompt}
                            onSave={handleSave}
                            onCancel={() => {
                                setIsCreating(false);
                                setShowMobileForm(false);
                            }}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                            <p>Select a prompt or create a new one</p>
                            <Button onClick={() => setMobileListOpen(true)}>
                                <Menu className="h-4 w-4 mr-2" />
                                Open Prompts List
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Desktop layout
    return (
        <div className="flex h-full">
            {/* Left panel - Fixed Sidebar */}
            <div className="w-[300px] h-full border-r border-input bg-muted flex flex-col flex-shrink-0">
                {sidebarContent}
            </div>

            {/* Right panel - Content Area */}
            <div className="flex-1 h-full overflow-auto">
                <div className="max-w-3xl mx-auto p-6">
                    {(isCreating || selectedPrompt) ? (
                        <PromptForm
                            key={selectedPrompt?.id || 'new'}
                            prompt={selectedPrompt}
                            onSave={handleSave}
                            onCancel={() => {
                                setIsCreating(false);
                                setShowMobileForm(false);
                            }}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p>Select a prompt to edit or create a new one</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 
