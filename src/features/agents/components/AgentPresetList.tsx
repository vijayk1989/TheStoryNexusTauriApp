import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { MoreVertical, Edit, Trash2, Copy, Bot } from 'lucide-react';
import { useAgentsStore } from '../stores/useAgentsStore';
import type { AgentPreset, AgentRole, AllowedModel } from '@/types/story';
import { toast } from 'react-toastify';

interface AgentPresetListProps {
    agents: AgentPreset[];
    onEdit: (agent: AgentPreset) => void;
    selectedAgentIds?: string[];
    onSelectionChange?: (ids: string[]) => void;
}

const ROLE_COLORS: Record<AgentRole, string> = {
    summarizer: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    prose_writer: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    lore_judge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    continuity_checker: 'bg-green-500/10 text-green-500 border-green-500/20',
    style_editor: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    dialogue_specialist: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    expander: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    outline_generator: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    style_extractor: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    scenebeat_generator: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
    refusal_checker: 'bg-red-500/10 text-red-500 border-red-500/20',
    chapter_reviewer: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
    chapter_editor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    lore_writer: 'bg-lime-500/10 text-lime-500 border-lime-500/20',
    lore_refiner: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    judge_aggregator: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    custom: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

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
    chapter_reviewer: 'Chapter Reviewer',
    chapter_editor: 'Chapter Editor',
    lore_writer: 'Lore Writer',
    lore_refiner: 'Lore Refiner',
    judge_aggregator: 'Judge Aggregator',
    custom: 'Custom',
};

export function AgentPresetList({ agents, onEdit, selectedAgentIds = [], onSelectionChange }: AgentPresetListProps) {
    const { deleteAgentPreset, createAgentPreset } = useAgentsStore();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [agentToDelete, setAgentToDelete] = useState<AgentPreset | null>(null);

    const handleToggleSelect = (agentId: string) => {
        const newSelection = selectedAgentIds.includes(agentId)
            ? selectedAgentIds.filter(id => id !== agentId)
            : [...selectedAgentIds, agentId];
        onSelectionChange?.(newSelection);
    };

    const handleSelectAllInGroup = (roleAgents: AgentPreset[]) => {
        const agentIdsInGroup = roleAgents.map(a => a.id);
        const allSelected = agentIdsInGroup.every(id => selectedAgentIds.includes(id));
        const newSelection = allSelected
            ? selectedAgentIds.filter(id => !agentIdsInGroup.includes(id))
            : [...new Set([...selectedAgentIds, ...agentIdsInGroup])];
        onSelectionChange?.(newSelection);
    };

    const handleDelete = async () => {
        if (!agentToDelete) return;

        try {
            await deleteAgentPreset(agentToDelete.id);
            toast.success('Agent deleted successfully');
        } catch (error) {
            toast.error((error as Error).message || 'Failed to delete agent');
        } finally {
            setDeleteDialogOpen(false);
            setAgentToDelete(null);
        }
    };

    const handleDuplicate = async (agent: AgentPreset) => {
        try {
            await createAgentPreset({
                ...agent,
                name: `${agent.name} (Copy)`,
                isSystem: false,
            });
            toast.success('Agent duplicated successfully');
        } catch (error) {
            toast.error('Failed to duplicate agent');
        }
    };

    const confirmDelete = (agent: AgentPreset) => {
        setAgentToDelete(agent);
        setDeleteDialogOpen(true);
    };

    // Group agents by role
    const agentsByRole = agents.reduce((acc, agent) => {
        const role = agent.role;
        if (!acc[role]) {
            acc[role] = [];
        }
        acc[role].push(agent);
        return acc;
    }, {} as Record<AgentRole, AgentPreset[]>);

    if (agents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No agents configured</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                    Create your first agent to start building AI pipelines. Agents can be assigned 
                    specific roles like summarizing content or validating lore consistency.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                {Object.entries(agentsByRole).map(([role, roleAgents]) => {
                    const allSelected = roleAgents.every(a => selectedAgentIds.includes(a.id));
                    const someSelected = roleAgents.some(a => selectedAgentIds.includes(a.id));
                    
                    return (
                        <div key={role}>
                            <div className="flex items-center gap-2 mb-3">
                                <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={() => handleSelectAllInGroup(roleAgents)}
                                    aria-label={`Select all ${role} agents`}
                                />
                                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 flex-1">
                                    <Badge variant="outline" className={ROLE_COLORS[role as AgentRole]}>
                                        {ROLE_LABELS[role as AgentRole]}
                                    </Badge>
                                    <span className="text-xs">({roleAgents.length})</span>
                                </h3>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {roleAgents.map((agent) => (
                                    <Card
                                        key={agent.id}
                                        className={`relative cursor-pointer transition-all ${
                                            selectedAgentIds.includes(agent.id) ? 'ring-2 ring-primary bg-primary/5' : ''
                                        }`}
                                        onClick={() => handleToggleSelect(agent.id)}
                                    >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div
                                                className="space-y-1 flex-1"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={selectedAgentIds.includes(agent.id)}
                                                        onCheckedChange={() => handleToggleSelect(agent.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        aria-label={`Select ${agent.name}`}
                                                    />
                                                    <CardTitle className="text-base flex items-center gap-2">
                                                        {agent.name}
                                                        {agent.isSystem && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                System
                                                            </Badge>
                                                        )}
                                                    </CardTitle>
                                                </div>
                                                {agent.description && (
                                                    <CardDescription className="text-xs line-clamp-2">
                                                        {agent.description}
                                                    </CardDescription>
                                                )}
                                            </div>
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => onEdit(agent)}>
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDuplicate(agent)}>
                                                        <Copy className="h-4 w-4 mr-2" />
                                                        Duplicate
                                                    </DropdownMenuItem>
                                                    {!agent.isSystem && (
                                                        <DropdownMenuItem
                                                            onClick={() => confirmDelete(agent)}
                                                            className="text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Model:</span>
                                                <span className="font-mono text-xs truncate max-w-[150px]" title={agent.model.name}>
                                                    {agent.model.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Temperature:</span>
                                                <span>{agent.temperature}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Max Tokens:</span>
                                                <span>{agent.maxTokens}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                    );
                })}
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Agent</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{agentToDelete?.name}"? This action cannot be undone.
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
