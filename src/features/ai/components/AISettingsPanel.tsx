/**
 * Compact AI Settings panel for the Story Editor sidebar Sheet.
 * Mirrors AISettingsPage functionality in a narrower layout.
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, Loader2, RefreshCw, Upload } from 'lucide-react';
import { aiService } from '@/services/ai/AIService';
import { toast } from 'react-toastify';
import type { AIModel } from '@/types/story';
import { cn } from '@/lib/utils';
import { db } from '@/services/database';
import { useImageGenerationStore } from '@/features/images/stores/useImageGenerationStore';
import { usePromptStore } from '@/features/prompts/store/promptStore';
import { inferComfyTextToImageMapping, normalizeComfyWorkflowJson } from '@/features/images/services/comfyWorkflow';

type ProviderType = 'openai' | 'openrouter' | 'nanogpt' | 'local' | 'openai_compatible' | 'google';

export function AISettingsPanel() {
    const [openaiKey, setOpenaiKey] = useState('');
    const [openrouterKey, setOpenrouterKey] = useState('');
    const [nanogptKey, setNanogptKey] = useState('');
    const [openaiCompatibleKey, setOpenaiCompatibleKey] = useState('');
    const [openaiCompatibleUrl, setOpenaiCompatibleUrl] = useState('');
    const [openaiCompatibleModelsRoute, setOpenaiCompatibleModelsRoute] = useState('');
    const [googleKey, setGoogleKey] = useState('');
    const [tavilyKey, setTavilyKey] = useState('');
    const [localApiUrl, setLocalApiUrl] = useState('http://localhost:1234/v1');
    const [loadingProvider, setLoadingProvider] = useState<ProviderType | null>(null);
    const [models, setModels] = useState<Record<string, AIModel[]>>({
        openai: [],
        openrouter: [],
        nanogpt: [],
        local: [],
        openai_compatible: [],
        google: [],
    });
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
    const [defaultImageProvider, setDefaultImageProvider] = useState<'openrouter' | 'comfyui'>('openrouter');
    const [defaultImagePromptId, setDefaultImagePromptId] = useState('none');
    const [defaultOpenRouterImageModelId, setDefaultOpenRouterImageModelId] = useState('');
    const [comfyBaseUrl, setComfyBaseUrl] = useState('http://127.0.0.1:8188');
    const [comfyTxt2ImgWorkflowJson, setComfyTxt2ImgWorkflowJson] = useState('');
    const [comfyImg2ImgWorkflowJson, setComfyImg2ImgWorkflowJson] = useState('');
    const [comfyTxt2ImgMapping, setComfyTxt2ImgMapping] = useState('{\n  "positivePrompt": "",\n  "outputNodeId": ""\n}');
    const [comfyImg2ImgMapping, setComfyImg2ImgMapping] = useState('{\n  "positivePrompt": "",\n  "sourceImage": "",\n  "outputNodeId": ""\n}');
    const [defaultImageWidth, setDefaultImageWidth] = useState(1024);
    const [defaultImageHeight, setDefaultImageHeight] = useState(1024);
    const [defaultImageSteps, setDefaultImageSteps] = useState(20);
    const [defaultImageCfg, setDefaultImageCfg] = useState(4);
    const [defaultImageSeedMode, setDefaultImageSeedMode] = useState<'random' | 'fixed'>('random');
    const { openRouterImageModels, refreshOpenRouterImageModels } = useImageGenerationStore();
    const { prompts, fetchPrompts } = usePromptStore();

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            await aiService.initialize();

            const oKey = aiService.getOpenAIKey();
            const orKey = aiService.getOpenRouterKey();
            const nKey = aiService.getNanoGPTKey();
            const ocKey = aiService.getOpenAICompatibleKey();
            const ocUrl = aiService.getOpenAICompatibleUrl();
            const ocRoute = aiService.getOpenAICompatibleModelsRoute();
            const gKey = aiService.getGoogleKey();
            const tKey = aiService.getTavilyKey();
            const lUrl = aiService.getLocalApiUrl();

            if (oKey) setOpenaiKey(oKey);
            if (orKey) setOpenrouterKey(orKey);
            if (nKey) setNanogptKey(nKey);
            if (ocKey) setOpenaiCompatibleKey(ocKey);
            if (ocUrl) setOpenaiCompatibleUrl(ocUrl);
            if (ocRoute) setOpenaiCompatibleModelsRoute(ocRoute);
            if (gKey) setGoogleKey(gKey);
            if (tKey) setTavilyKey(tKey);
            if (lUrl) setLocalApiUrl(lUrl);
            const current = aiService.getSettings() || (await db.aiSettings.toArray())[0];
            if (current) {
                setDefaultImageProvider(current.defaultImageProvider || 'openrouter');
                setDefaultImagePromptId(current.defaultImagePromptId || 'none');
                setDefaultOpenRouterImageModelId(current.defaultOpenRouterImageModelId || '');
                setComfyBaseUrl(current.comfyBaseUrl || 'http://127.0.0.1:8188');
                setComfyTxt2ImgWorkflowJson(current.comfyTxt2ImgWorkflowJson || '');
                setComfyImg2ImgWorkflowJson(current.comfyImg2ImgWorkflowJson || '');
                setComfyTxt2ImgMapping(JSON.stringify(current.comfyTxt2ImgMapping || { positivePrompt: '', outputNodeId: '' }, null, 2));
                setComfyImg2ImgMapping(JSON.stringify(current.comfyImg2ImgMapping || { positivePrompt: '', sourceImage: '', outputNodeId: '' }, null, 2));
                setDefaultImageWidth(current.defaultImageWidth || 1024);
                setDefaultImageHeight(current.defaultImageHeight || 1024);
                setDefaultImageSteps(current.defaultImageSteps || 20);
                setDefaultImageCfg(current.defaultImageCfg || 4);
                setDefaultImageSeedMode(current.defaultImageSeedMode || 'random');
            }
            await fetchPrompts();

            const allModels = await aiService.getAvailableModels(undefined, false);
            setModels({
                openai: allModels.filter(m => m.provider === 'openai'),
                openrouter: allModels.filter(m => m.provider === 'openrouter'),
                nanogpt: allModels.filter(m => m.provider === 'nanogpt'),
                local: allModels.filter(m => m.provider === 'local'),
                openai_compatible: allModels.filter(m => m.provider === 'openai_compatible'),
                google: allModels.filter(m => m.provider === 'google'),
            });
        } catch (error) {
            console.error('Error loading AI settings:', error);
            toast.error('Failed to load AI settings');
        }
    };

    const handleKeyUpdate = async (provider: ProviderType, key: string) => {
        if (provider !== 'local' && !key.trim()) return;
        setLoadingProvider(provider);
        try {
            await aiService.updateKey(provider, key);
            const fetched = await aiService.getAvailableModels(provider, true);
            setModels(prev => ({ ...prev, [provider]: fetched }));
            setOpenSections(prev => ({ ...prev, [`${provider}_models`]: true }));
            toast.success(`${providerLabel(provider)} models updated`);
        } catch {
            toast.error(`Failed to update ${providerLabel(provider)} models`);
        } finally {
            setLoadingProvider(null);
        }
    };

    const handleRefresh = async (provider: ProviderType) => {
        setLoadingProvider(provider);
        try {
            const fetched = await aiService.getAvailableModels(provider, true);
            setModels(prev => ({ ...prev, [provider]: fetched }));
            setOpenSections(prev => ({ ...prev, [`${provider}_models`]: true }));
            toast.success(`${providerLabel(provider)} models refreshed`);
        } catch {
            toast.error(`Failed to refresh ${providerLabel(provider)} models`);
        } finally {
            setLoadingProvider(null);
        }
    };

    const handleLocalUrlUpdate = async (url: string) => {
        if (!url.trim()) return;
        setLoadingProvider('local');
        try {
            await aiService.updateLocalApiUrl(url);
            const fetched = await aiService.getAvailableModels('local', true);
            setModels(prev => ({ ...prev, local: fetched }));
            setOpenSections(prev => ({ ...prev, local_models: true }));
            toast.success('Local API URL updated');
        } catch {
            toast.error('Failed to update local API URL');
        } finally {
            setLoadingProvider(null);
        }
    };

    const handleCompatibleUrlUpdate = async (url: string) => {
        if (!url.trim()) return;
        setLoadingProvider('openai_compatible');
        try {
            await aiService.updateOpenAICompatibleUrl(url);
            const fetched = await aiService.getAvailableModels('openai_compatible', true);
            setModels(prev => ({ ...prev, openai_compatible: fetched }));
            setOpenSections(prev => ({ ...prev, openai_compatible_models: true }));
            toast.success('OpenAI-compatible URL updated');
        } catch {
            toast.error('Failed to update URL');
        } finally {
            setLoadingProvider(null);
        }
    };

    const handleCompatibleModelsRouteUpdate = async (route: string) => {
        setLoadingProvider('openai_compatible');
        try {
            await aiService.updateOpenAICompatibleModelsRoute(route);
            toast.success('Models route updated');
        } catch {
            toast.error('Failed to update models route');
        } finally {
            setLoadingProvider(null);
        }
    };

    const handleTavilyKeyUpdate = async (key: string) => {
        if (!key.trim()) return;
        try {
            await aiService.updateTavilyKey(key);
            toast.success('Tavily API key updated');
        } catch {
            toast.error('Failed to update Tavily API key');
        }
    };

    const handleSaveImageSettings = async () => {
        try {
            const settings = aiService.getSettings() || (await db.aiSettings.toArray())[0];
            if (!settings) throw new Error('AI settings are not initialized');
            await db.aiSettings.update(settings.id, {
                defaultImageProvider,
                defaultImagePromptId: defaultImagePromptId === 'none' ? undefined : defaultImagePromptId,
                defaultOpenRouterImageModelId,
                comfyBaseUrl,
                comfyTxt2ImgWorkflowJson,
                comfyImg2ImgWorkflowJson,
                comfyTxt2ImgMapping: JSON.parse(comfyTxt2ImgMapping || '{}'),
                comfyImg2ImgMapping: JSON.parse(comfyImg2ImgMapping || '{}'),
                defaultImageWidth,
                defaultImageHeight,
                defaultImageSteps,
                defaultImageCfg,
                defaultImageSeedMode,
            });
            toast.success('Image generation settings saved');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to save image settings');
        }
    };

    const handleComfyWorkflowFile = async (mode: 'txt2img' | 'img2img', file?: File) => {
        if (!file) return;

        try {
            const parsed = JSON.parse(await file.text());
            const normalized = normalizeComfyWorkflowJson(parsed);
            const workflowJson = JSON.stringify(normalized.workflow, null, 2);

            if (mode === 'txt2img') {
                setComfyTxt2ImgWorkflowJson(workflowJson);
                const mapping = inferComfyTextToImageMapping(normalized.workflow);
                if (mapping) {
                    setComfyTxt2ImgMapping(JSON.stringify(mapping, null, 2));
                }
            } else {
                setComfyImg2ImgWorkflowJson(workflowJson);
            }

            const formatLabel = normalized.format === 'ui' ? 'converted workflow' : 'API prompt';
            toast.success(`Loaded ${formatLabel} (${normalized.nodeCount} nodes)`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not load workflow JSON');
        }
    };

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const isLoading = (provider: ProviderType) => loadingProvider === provider;

    return (
        <div className="space-y-4">
            {/* Local Models */}
            <ProviderSection
                title="Local Models"
                description="LM Studio / Ollama"
                open={openSections.local}
                onToggle={() => toggleSection('local')}
            >
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            placeholder="http://localhost:1234/v1"
                            value={localApiUrl}
                            onChange={(e) => setLocalApiUrl(e.target.value)}
                            className="text-sm"
                        />
                        <Button
                            size="sm"
                            onClick={() => handleLocalUrlUpdate(localApiUrl)}
                            disabled={isLoading('local') || !localApiUrl.trim()}
                        >
                            {isLoading('local') ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                        </Button>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleRefresh('local')}
                        disabled={isLoading('local')}
                    >
                        {isLoading('local') ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                        Refresh Models
                    </Button>
                    <ModelList
                        models={models.local}
                        open={openSections.local_models}
                        onToggle={() => toggleSection('local_models')}
                    />
                </div>
            </ProviderSection>

            {/* OpenAI */}
            <ProviderSection
                title="OpenAI"
                open={openSections.openai}
                onToggle={() => toggleSection('openai')}
            >
                <div className="space-y-3">
                    <div>
                        <Label className="text-xs">API Key</Label>
                        <div className="flex gap-2 mt-1">
                            <Input
                                type="password"
                                placeholder="sk-..."
                                value={openaiKey}
                                onChange={(e) => setOpenaiKey(e.target.value)}
                                className="text-sm"
                            />
                            <Button
                                size="sm"
                                onClick={() => handleKeyUpdate('openai', openaiKey)}
                                disabled={isLoading('openai') || !openaiKey.trim()}
                            >
                                {isLoading('openai') ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                            </Button>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleRefresh('openai')}
                        disabled={isLoading('openai') || !openaiKey.trim()}
                    >
                        {isLoading('openai') ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                        Refresh Models
                    </Button>
                    <ModelList
                        models={models.openai}
                        open={openSections.openai_models}
                        onToggle={() => toggleSection('openai_models')}
                    />
                </div>
            </ProviderSection>

            {/* OpenRouter */}
            <ProviderSection
                title="OpenRouter"
                open={openSections.openrouter}
                onToggle={() => toggleSection('openrouter')}
            >
                <div className="space-y-3">
                    <div>
                        <Label className="text-xs">API Key</Label>
                        <div className="flex gap-2 mt-1">
                            <Input
                                type="password"
                                placeholder="sk-or-..."
                                value={openrouterKey}
                                onChange={(e) => setOpenrouterKey(e.target.value)}
                                className="text-sm"
                            />
                            <Button
                                size="sm"
                                onClick={() => handleKeyUpdate('openrouter', openrouterKey)}
                                disabled={isLoading('openrouter') || !openrouterKey.trim()}
                            >
                                {isLoading('openrouter') ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                            </Button>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleRefresh('openrouter')}
                        disabled={isLoading('openrouter') || !openrouterKey.trim()}
                    >
                        {isLoading('openrouter') ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                        Refresh Models
                    </Button>
                    <ModelList
                        models={models.openrouter}
                        open={openSections.openrouter_models}
                        onToggle={() => toggleSection('openrouter_models')}
                    />
                </div>
            </ProviderSection>

            {/* NanoGPT */}
            <ProviderSection
                title="NanoGPT"
                open={openSections.nanogpt}
                onToggle={() => toggleSection('nanogpt')}
            >
                <div className="space-y-3">
                    <div>
                        <Label className="text-xs">API Key</Label>
                        <div className="flex gap-2 mt-1">
                            <Input
                                type="password"
                                placeholder="Enter NanoGPT key"
                                value={nanogptKey}
                                onChange={(e) => setNanogptKey(e.target.value)}
                                className="text-sm"
                            />
                            <Button
                                size="sm"
                                onClick={() => handleKeyUpdate('nanogpt', nanogptKey)}
                                disabled={isLoading('nanogpt') || !nanogptKey.trim()}
                            >
                                {isLoading('nanogpt') ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                            </Button>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleRefresh('nanogpt')}
                        disabled={isLoading('nanogpt') || !nanogptKey.trim()}
                    >
                        {isLoading('nanogpt') ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                        Refresh Models
                    </Button>
                    <ModelList
                        models={models.nanogpt}
                        open={openSections.nanogpt_models}
                        onToggle={() => toggleSection('nanogpt_models')}
                    />
                </div>
            </ProviderSection>

            {/* OpenAI-Compatible */}
            <ProviderSection
                title="OpenAI-Compatible"
                open={openSections.openai_compatible}
                onToggle={() => toggleSection('openai_compatible')}
            >
                <div className="space-y-3">
                    <div>
                        <Label className="text-xs">Endpoint URL</Label>
                        <div className="flex gap-2 mt-1">
                            <Input
                                type="text"
                                placeholder="https://your-api.example/v1"
                                value={openaiCompatibleUrl}
                                onChange={(e) => setOpenaiCompatibleUrl(e.target.value)}
                                className="text-sm"
                            />
                            <Button
                                size="sm"
                                onClick={() => handleCompatibleUrlUpdate(openaiCompatibleUrl)}
                                disabled={isLoading('openai_compatible') || !openaiCompatibleUrl.trim()}
                            >
                                {isLoading('openai_compatible') ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                            </Button>
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs">API Key</Label>
                        <div className="flex gap-2 mt-1">
                            <Input
                                type="password"
                                placeholder="Enter API key"
                                value={openaiCompatibleKey}
                                onChange={(e) => setOpenaiCompatibleKey(e.target.value)}
                                className="text-sm"
                            />
                            <Button
                                size="sm"
                                onClick={() => handleKeyUpdate('openai_compatible', openaiCompatibleKey)}
                                disabled={isLoading('openai_compatible') || !openaiCompatibleKey.trim()}
                            >
                                {isLoading('openai_compatible') ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                            </Button>
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs">Custom Models Route (optional)</Label>
                        <div className="flex gap-2 mt-1">
                            <Input
                                type="text"
                                placeholder="/v1/models"
                                value={openaiCompatibleModelsRoute}
                                onChange={(e) => setOpenaiCompatibleModelsRoute(e.target.value)}
                                className="text-sm"
                            />
                            <Button
                                size="sm"
                                onClick={() => handleCompatibleModelsRouteUpdate(openaiCompatibleModelsRoute)}
                                disabled={isLoading('openai_compatible')}
                            >
                                {isLoading('openai_compatible') ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                            </Button>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleRefresh('openai_compatible')}
                        disabled={isLoading('openai_compatible') || (!openaiCompatibleKey.trim() && !openaiCompatibleUrl.trim())}
                    >
                        {isLoading('openai_compatible') ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                        Refresh Models
                    </Button>
                    <ModelList
                        models={models.openai_compatible}
                        open={openSections.openai_compatible_models}
                        onToggle={() => toggleSection('openai_compatible_models')}
                    />
                </div>
            </ProviderSection>

            {/* Google AI */}
            <ProviderSection
                title="Google AI"
                description="Gemini via Google AI Studio"
                open={openSections.google}
                onToggle={() => toggleSection('google')}
            >
                <div className="space-y-3">
                    <div>
                        <Label className="text-xs">API Key</Label>
                        <div className="flex gap-2 mt-1">
                            <Input
                                type="password"
                                placeholder="AIza..."
                                value={googleKey}
                                onChange={(e) => setGoogleKey(e.target.value)}
                                className="text-sm"
                            />
                            <Button
                                size="sm"
                                onClick={() => handleKeyUpdate('google', googleKey)}
                                disabled={isLoading('google') || !googleKey.trim()}
                            >
                                {isLoading('google') ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                            </Button>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleRefresh('google')}
                        disabled={isLoading('google') || !googleKey.trim()}
                    >
                        {isLoading('google') ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                        Refresh Models
                    </Button>
                    <ModelList
                        models={models.google}
                        open={openSections.google_models}
                        onToggle={() => toggleSection('google_models')}
                    />
                </div>
            </ProviderSection>

            {/* Web Search (Tavily) */}
            <ProviderSection
                title="Web Search (Tavily)"
                description="Enable AI to search the web"
                open={openSections.tavily}
                onToggle={() => toggleSection('tavily')}
            >
                <div className="space-y-3">
                    <div>
                        <Label className="text-xs">API Key</Label>
                        <div className="flex gap-2 mt-1">
                            <Input
                                type="password"
                                placeholder="tvly-..."
                                value={tavilyKey}
                                onChange={(e) => setTavilyKey(e.target.value)}
                                className="text-sm"
                            />
                            <Button
                                size="sm"
                                onClick={() => handleTavilyKeyUpdate(tavilyKey)}
                                disabled={!tavilyKey.trim()}
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            </ProviderSection>

            <ProviderSection
                title="Image Generation"
                description="ComfyUI and OpenRouter image defaults"
                open={openSections.image_generation}
                onToggle={() => toggleSection('image_generation')}
            >
                <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <Label className="text-xs">Default Provider</Label>
                            <Select value={defaultImageProvider} onValueChange={(value: 'openrouter' | 'comfyui') => setDefaultImageProvider(value)}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                                    <SelectItem value="comfyui">ComfyUI</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs">Default Prompt</Label>
                            <Select value={defaultImagePromptId} onValueChange={setDefaultImagePromptId}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Raw prompt</SelectItem>
                                    {prompts.filter(prompt => prompt.promptType === 'image_gen').map(prompt => (
                                        <SelectItem key={prompt.id} value={prompt.id}>{prompt.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between gap-2">
                            <Label className="text-xs">OpenRouter Image Model</Label>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refreshOpenRouterImageModels().catch(error => toast.error(error instanceof Error ? error.message : 'Refresh failed'))}
                            >
                                <RefreshCw className="mr-1 h-3 w-3" />
                                Refresh
                            </Button>
                        </div>
                        <Select value={defaultOpenRouterImageModelId} onValueChange={setDefaultOpenRouterImageModelId}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select OpenRouter image model" />
                            </SelectTrigger>
                            <SelectContent>
                                {openRouterImageModels.map(model => (
                                    <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <Label className="text-xs">Default Width</Label>
                            <Input className="mt-1" type="number" value={defaultImageWidth} onChange={event => setDefaultImageWidth(Number(event.target.value) || 1024)} />
                        </div>
                        <div>
                            <Label className="text-xs">Default Height</Label>
                            <Input className="mt-1" type="number" value={defaultImageHeight} onChange={event => setDefaultImageHeight(Number(event.target.value) || 1024)} />
                        </div>
                        <div>
                            <Label className="text-xs">Default Steps</Label>
                            <Input className="mt-1" type="number" min={1} value={defaultImageSteps} onChange={event => setDefaultImageSteps(Number(event.target.value) || 20)} />
                        </div>
                        <div>
                            <Label className="text-xs">Default CFG</Label>
                            <Input className="mt-1" type="number" min={0} step={0.1} value={defaultImageCfg} onChange={event => setDefaultImageCfg(Number(event.target.value) || 4)} />
                        </div>
                        <div>
                            <Label className="text-xs">Seed Mode</Label>
                            <Select value={defaultImageSeedMode} onValueChange={(value: 'random' | 'fixed') => setDefaultImageSeedMode(value)}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="random">Random</SelectItem>
                                    <SelectItem value="fixed">Fixed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs">ComfyUI Base URL</Label>
                        <Input className="mt-1" value={comfyBaseUrl} onChange={event => setComfyBaseUrl(event.target.value)} />
                    </div>
                    <div>
                        <div className="flex items-center justify-between gap-2">
                            <Label className="text-xs">Text-to-Image Workflow JSON</Label>
                            <WorkflowUploadButton onFile={(file) => handleComfyWorkflowFile('txt2img', file)} />
                        </div>
                        <Textarea className="mt-1 min-h-[120px] font-mono text-xs" value={comfyTxt2ImgWorkflowJson} onChange={event => setComfyTxt2ImgWorkflowJson(event.target.value)} />
                    </div>
                    <div>
                        <Label className="text-xs">Text-to-Image Mapping JSON</Label>
                        <Textarea className="mt-1 min-h-[100px] font-mono text-xs" value={comfyTxt2ImgMapping} onChange={event => setComfyTxt2ImgMapping(event.target.value)} />
                    </div>
                    <div>
                        <div className="flex items-center justify-between gap-2">
                            <Label className="text-xs">Image-to-Image Workflow JSON</Label>
                            <WorkflowUploadButton onFile={(file) => handleComfyWorkflowFile('img2img', file)} />
                        </div>
                        <Textarea className="mt-1 min-h-[120px] font-mono text-xs" value={comfyImg2ImgWorkflowJson} onChange={event => setComfyImg2ImgWorkflowJson(event.target.value)} />
                    </div>
                    <div>
                        <Label className="text-xs">Image-to-Image Mapping JSON</Label>
                        <Textarea className="mt-1 min-h-[100px] font-mono text-xs" value={comfyImg2ImgMapping} onChange={event => setComfyImg2ImgMapping(event.target.value)} />
                    </div>
                    <Button onClick={handleSaveImageSettings} className="w-full">Save Image Settings</Button>
                </div>
            </ProviderSection>
        </div>
    );
}

// ── Helpers ────────────────────────────────────────────────────

function WorkflowUploadButton({ onFile }: { onFile: (file?: File) => void }) {
    return (
        <Button asChild variant="outline" size="sm">
            <label className="cursor-pointer">
                <Upload className="mr-1 h-3 w-3" />
                Upload JSON
                <input
                    type="file"
                    accept=".json,application/json"
                    className="sr-only"
                    onChange={(event) => {
                        onFile(event.currentTarget.files?.[0]);
                        event.currentTarget.value = '';
                    }}
                />
            </label>
        </Button>
    );
}

function providerLabel(provider: ProviderType): string {
    switch (provider) {
        case 'openai': return 'OpenAI';
        case 'openrouter': return 'OpenRouter';
        case 'nanogpt': return 'NanoGPT';
        case 'local': return 'Local';
        case 'openai_compatible': return 'OpenAI-Compatible';
        case 'google': return 'Google AI';
    }
}

function ProviderSection({
    title,
    description,
    open,
    onToggle,
    children,
}: {
    title: string;
    description?: string;
    open?: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <Collapsible open={open} onOpenChange={onToggle}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-muted/50 transition-colors">
                <ChevronRight className={cn(
                    "h-4 w-4 transition-transform flex-shrink-0",
                    open && "rotate-90"
                )} />
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{title}</div>
                    {description && (
                        <div className="text-xs text-muted-foreground">{description}</div>
                    )}
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 pr-1 pt-2 pb-3 border-l ml-2">
                {children}
            </CollapsibleContent>
        </Collapsible>
    );
}

function ModelList({
    models,
    open,
    onToggle,
}: {
    models: AIModel[];
    open?: boolean;
    onToggle: () => void;
}) {
    if (models.length === 0) return null;
    return (
        <Collapsible open={open} onOpenChange={onToggle}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                <ChevronRight className={cn(
                    "h-3 w-3 transition-transform",
                    open && "rotate-90"
                )} />
                {models.length} model{models.length !== 1 ? 's' : ''} available
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-0.5 max-h-[200px] overflow-y-auto">
                {models.map(model => (
                    <div key={model.id} className="text-xs pl-5 py-0.5 text-muted-foreground truncate">
                        {model.name}
                    </div>
                ))}
            </CollapsibleContent>
        </Collapsible>
    );
}
