import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Bot, GitBranch, History } from 'lucide-react';
import { useAgentsStore } from '../stores/useAgentsStore';
import { useStoryContext } from '@/features/stories/context/StoryContext';
import { AgentPresetList } from './AgentPresetList';
import { AgentPresetForm } from './AgentPresetForm';
import { PipelinePresetList } from './PipelinePresetList';
import { PipelinePresetForm } from './PipelinePresetForm';
import type { AgentPreset, PipelinePreset } from '@/types/story';
import { ScrollArea } from '@/components/ui/scroll-area';

export function AgentsManager() {
    const { currentStoryId } = useStoryContext();
    const {
        agentPresets,
        pipelinePresets,
        loadAgentPresets,
        loadPipelinePresets,
        isLoadingPresets,
        isLoadingPipelines,
    } = useAgentsStore();

    const [activeTab, setActiveTab] = useState<'agents' | 'pipelines' | 'history'>('agents');
    const [showAgentForm, setShowAgentForm] = useState(false);
    const [showPipelineForm, setShowPipelineForm] = useState(false);
    const [editingAgent, setEditingAgent] = useState<AgentPreset | undefined>();
    const [editingPipeline, setEditingPipeline] = useState<PipelinePreset | undefined>();

    useEffect(() => {
        loadAgentPresets(currentStoryId);
        loadPipelinePresets(currentStoryId);
    }, [currentStoryId, loadAgentPresets, loadPipelinePresets]);

    const handleNewAgent = (e?: React.MouseEvent) => {
        e?.preventDefault();
        e?.stopPropagation();
        console.log('[AgentsManager] handleNewAgent called');
        setEditingAgent(undefined);
        setShowAgentForm(true);
    };

    const handleEditAgent = (agent: AgentPreset) => {
        setEditingAgent(agent);
        setShowAgentForm(true);
    };

    const handleAgentFormClose = () => {
        setShowAgentForm(false);
        setEditingAgent(undefined);
    };

    const handleNewPipeline = (e?: React.MouseEvent) => {
        e?.preventDefault();
        e?.stopPropagation();
        console.log('[AgentsManager] handleNewPipeline called');
        setEditingPipeline(undefined);
        setShowPipelineForm(true);
    };

    const handleEditPipeline = (pipeline: PipelinePreset) => {
        setEditingPipeline(pipeline);
        setShowPipelineForm(true);
    };

    const handlePipelineFormClose = () => {
        setShowPipelineForm(false);
        setEditingPipeline(undefined);
    };

    // Show form views
    if (showAgentForm) {
        console.log('[AgentsManager] Rendering AgentPresetForm');
        return (
            <div className="h-full flex flex-col p-6">
                <AgentPresetForm
                    agent={editingAgent}
                    onSave={handleAgentFormClose}
                    onCancel={handleAgentFormClose}
                />
            </div>
        );
    }

    if (showPipelineForm) {
        return (
            <div className="h-full flex flex-col p-6">
                <PipelinePresetForm
                    pipeline={editingPipeline}
                    onSave={handlePipelineFormClose}
                    onCancel={handlePipelineFormClose}
                />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="border-b px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Agent Orchestration</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Configure AI agents and pipelines for multi-step generation
                        </p>
                    </div>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
                <div className="border-b px-6">
                    <TabsList className="h-12">
                        <TabsTrigger value="agents" className="flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            Agents ({agentPresets.length})
                        </TabsTrigger>
                        <TabsTrigger value="pipelines" className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4" />
                            Pipelines ({pipelinePresets.length})
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex items-center gap-2">
                            <History className="h-4 w-4" />
                            History
                        </TabsTrigger>
                    </TabsList>
                </div>

                <ScrollArea className="flex-1">
                    <TabsContent value="agents" className="mt-0 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-lg font-semibold">Agent Presets</h2>
                                <p className="text-sm text-muted-foreground">
                                    Configure individual AI agents with specific roles and models
                                </p>
                            </div>
                            <Button type="button" onClick={handleNewAgent} className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                New Agent
                            </Button>
                        </div>

                        {isLoadingPresets ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-muted-foreground">Loading agents...</div>
                            </div>
                        ) : (
                            <AgentPresetList
                                agents={agentPresets}
                                onEdit={handleEditAgent}
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="pipelines" className="mt-0 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-lg font-semibold">Pipeline Presets</h2>
                                <p className="text-sm text-muted-foreground">
                                    Chain multiple agents together for complex generation workflows
                                </p>
                            </div>
                            <Button type="button" onClick={handleNewPipeline} className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                New Pipeline
                            </Button>
                        </div>

                        {isLoadingPipelines ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-muted-foreground">Loading pipelines...</div>
                            </div>
                        ) : (
                            <PipelinePresetList
                                pipelines={pipelinePresets}
                                onEdit={handleEditPipeline}
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="history" className="mt-0 p-6">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold">Execution History</h2>
                            <p className="text-sm text-muted-foreground">
                                View past pipeline executions and their results
                            </p>
                        </div>

                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            Pipeline execution history will appear here
                        </div>
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </div>
    );
}
