import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import { AIService } from '@/services/ai/AIService';
import type { AllowedModel, AIModel } from '@/types/story';

interface BulkUpdatePanelProps {
    selectedCount: number;
    isVisible: boolean;
    onClose: () => void;
    onApplyModel: (model: AllowedModel) => Promise<void>;
    isApplying?: boolean;
}

export function BulkUpdatePanel({
    selectedCount,
    isVisible,
    onClose,
    onApplyModel,
    isApplying = false,
}: BulkUpdatePanelProps) {
    const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    useEffect(() => {
        if (isVisible) {
            loadModels();
        }
    }, [isVisible]);

    const loadModels = async () => {
        setIsLoadingModels(true);
        try {
            const aiService = AIService.getInstance();
            const models = await aiService.getAvailableModels(undefined, false);
            setAvailableModels(models);
            if (models.length > 0) {
                setSelectedModel(models[0].id);
            }
        } catch (error) {
            console.error('Failed to load models:', error);
            toast.error('Failed to load available models');
        } finally {
            setIsLoadingModels(false);
        }
    };

    const handleApply = async () => {
        if (!selectedModel) {
            toast.error('Please select a model');
            return;
        }

        const selectedModelObj = availableModels.find(m => m.id === selectedModel);
        if (!selectedModelObj) {
            toast.error('Selected model not found');
            return;
        }

        const allowedModel: AllowedModel = {
            id: selectedModelObj.id,
            provider: selectedModelObj.provider,
            name: selectedModelObj.name,
        };

        try {
            await onApplyModel(allowedModel);
            toast.success(`Applied to ${selectedCount} item(s)`);
            onClose();
        } catch (error) {
            toast.error((error as Error).message || 'Failed to update items');
        }
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 border-t border-input bg-background p-4 shadow-lg z-40">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="text-sm font-medium">
                            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                            <span className="text-sm text-muted-foreground">Update model:</span>
                            <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isApplying}>
                                <SelectTrigger className="w-[250px]">
                                    <SelectValue placeholder="Select a model..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {isLoadingModels ? (
                                        <SelectItem value="loading" disabled>
                                            Loading models...
                                        </SelectItem>
                                    ) : availableModels.length === 0 ? (
                                        <SelectItem value="no-models" disabled>
                                            No models available
                                        </SelectItem>
                                    ) : (
                                        availableModels.map((model) => (
                                            <SelectItem key={model.id} value={model.id}>
                                                {model.name} ({model.provider})
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleApply}
                            disabled={isApplying || !selectedModel}
                            size="sm"
                        >
                            {isApplying ? 'Applying...' : 'Apply'}
                        </Button>
                        <Button
                            onClick={onClose}
                            variant="outline"
                            size="icon"
                            disabled={isApplying}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
