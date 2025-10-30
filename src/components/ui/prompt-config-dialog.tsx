import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Button } from "./button";
import { Plus } from "lucide-react";
import { PromptsList } from "@/features/prompts/components/PromptList";
import { PromptForm } from "@/features/prompts/components/PromptForm";
import type { Prompt } from "@/types/story";

interface PromptConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    promptType: Prompt['promptType'];
}

export const PromptConfigDialog = ({ open, onOpenChange, promptType }: PromptConfigDialogProps) => {
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>();
    const [isCreating, setIsCreating] = useState(false);

    // Reset state when dialog closes
    useEffect(() => {
        if (!open) {
            setSelectedPrompt(undefined);
            setIsCreating(false);
        }
    }, [open]);

    const handlePromptSelect = (prompt: Prompt) => {
        setSelectedPrompt(prompt);
        setIsCreating(false);
    };

    const handlePromptDelete = (promptId: string) => {
        if (selectedPrompt?.id === promptId) {
            setSelectedPrompt(undefined);
            setIsCreating(false);
        }
    };

    const handleSave = () => {
        setSelectedPrompt(undefined);
        setIsCreating(false);
    };

    const handleCancel = () => {
        setSelectedPrompt(undefined);
        setIsCreating(false);
    };

    const handleCreateNew = () => {
        setSelectedPrompt(undefined);
        setIsCreating(true);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] p-0 flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <DialogTitle>Configure Prompts</DialogTitle>
                        <Button onClick={handleCreateNew} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            New Prompt
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left sidebar - Prompts list */}
                    <div className="w-80 border-r overflow-auto">
                        <PromptsList
                            onPromptSelect={handlePromptSelect}
                            selectedPromptId={selectedPrompt?.id}
                            onPromptDelete={handlePromptDelete}
                            filterByType={promptType}
                        />
                    </div>

                    {/* Right content - Prompt form */}
                    <div className="flex-1 overflow-auto p-6">
                        {(selectedPrompt || isCreating) ? (
                            <PromptForm
                                prompt={selectedPrompt}
                                onSave={handleSave}
                                onCancel={handleCancel}
                                fixedType={promptType}
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <p className="text-lg mb-2">No prompt selected</p>
                                    <p className="text-sm">Select a prompt from the list or create a new one</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
