import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreVertical, Edit, Trash2, Copy, GitBranch, ArrowRight } from 'lucide-react';
import { useAgentsStore } from '../stores/useAgentsStore';
import type { PipelinePreset, AgentRole } from '@/types/story';
import { toast } from 'react-toastify';

interface PipelinePresetListProps {
    pipelines: PipelinePreset[];
    onEdit: (pipeline: PipelinePreset) => void;
}

const ROLE_LABELS: Record<AgentRole, string> = {
    summarizer: 'Summarizer',
    prose_writer: 'Prose Writer',
    lore_judge: 'Lore Judge',
    continuity_checker: 'Continuity Checker',
    style_editor: 'Style Editor',
    dialogue_specialist: 'Dialogue Specialist',
    expander: 'Expander',
    outline_generator: 'Outline Generator',
    style_extractor: 'Style Extractor',
    scenebeat_generator: 'Scene Beat Generator',
    refusal_checker: 'Refusal Checker',
    custom: 'Custom',
};

export function PipelinePresetList({ pipelines, onEdit }: PipelinePresetListProps) {
    const { deletePipelinePreset, createPipelinePreset, agentPresets } = useAgentsStore();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pipelineToDelete, setPipelineToDelete] = useState<PipelinePreset | null>(null);

    const handleDelete = async () => {
        if (!pipelineToDelete) return;

        try {
            await deletePipelinePreset(pipelineToDelete.id);
            toast.success('Pipeline deleted successfully');
        } catch (error) {
            toast.error((error as Error).message || 'Failed to delete pipeline');
        } finally {
            setDeleteDialogOpen(false);
            setPipelineToDelete(null);
        }
    };

    const handleDuplicate = async (pipeline: PipelinePreset) => {
        try {
            await createPipelinePreset({
                ...pipeline,
                name: `${pipeline.name} (Copy)`,
                isSystem: false,
            });
            toast.success('Pipeline duplicated successfully');
        } catch (error) {
            toast.error('Failed to duplicate pipeline');
        }
    };

    const confirmDelete = (pipeline: PipelinePreset) => {
        setPipelineToDelete(pipeline);
        setDeleteDialogOpen(true);
    };

    const getAgentName = (agentId: string): string => {
        const agent = agentPresets.find((a) => a.id === agentId);
        return agent?.name || 'Unknown Agent';
    };

    const getAgentRole = (agentId: string): AgentRole | undefined => {
        const agent = agentPresets.find((a) => a.id === agentId);
        return agent?.role;
    };

    if (pipelines.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No pipelines configured</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                    Create a pipeline to chain multiple agents together. For example: Summarizer → 
                    Prose Writer → Lore Judge for quality-checked content generation.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="grid gap-4 md:grid-cols-2">
                {pipelines.map((pipeline) => (
                    <Card key={pipeline.id} className="relative">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        {pipeline.name}
                                        {pipeline.isSystem && (
                                            <Badge variant="secondary" className="text-xs">
                                                System
                                            </Badge>
                                        )}
                                    </CardTitle>
                                    {pipeline.description && (
                                        <CardDescription className="text-xs line-clamp-2">
                                            {pipeline.description}
                                        </CardDescription>
                                    )}
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onEdit(pipeline)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDuplicate(pipeline)}>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Duplicate
                                        </DropdownMenuItem>
                                        {!pipeline.isSystem && (
                                            <DropdownMenuItem
                                                onClick={() => confirmDelete(pipeline)}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="text-xs text-muted-foreground">
                                    {pipeline.steps.length} step{pipeline.steps.length !== 1 ? 's' : ''}
                                </div>
                                <div className="flex flex-wrap items-center gap-1">
                                    {pipeline.steps
                                        .sort((a, b) => a.order - b.order)
                                        .map((step, index) => {
                                            const role = getAgentRole(step.agentPresetId);
                                            return (
                                                <div key={step.agentPresetId + index} className="flex items-center">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs"
                                                        title={getAgentName(step.agentPresetId)}
                                                    >
                                                        {role ? ROLE_LABELS[role] : 'Unknown'}
                                                    </Badge>
                                                    {index < pipeline.steps.length - 1 && (
                                                        <ArrowRight className="h-3 w-3 mx-1 text-muted-foreground" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Pipeline</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{pipelineToDelete?.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
