import { useEffect, useMemo, useState } from "react";
import { KeyRound, RefreshCw, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PromptSelectMenu } from "@/components/ui/prompt-select-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAIStore } from "@/features/ai/stores/useAIStore";
import {
    GENERATION_PROVIDER_LABELS,
    getConfiguredProvider,
    getGenerationSetupIssue,
    getSelectableProviderModels,
    isProviderConfigured,
} from "@/features/ai/utils/generationSetup";
import { getLocalApiUrl } from "@/services/ai/localRuntime";
import { aiService } from "@/services/ai/AIService";
import type { AIProvider, AllowedModel, Prompt } from "@/types/story";

const PROVIDERS: AIProvider[] = [
    "local",
    "openrouter",
    "openai",
    "google",
    "nanogpt",
    "openai_compatible",
];

type GenerationSetupDialogProps = {
    open: boolean;
    prompt: Prompt | null;
    initialModel?: AllowedModel;
    onOpenChange: (open: boolean) => void;
    onRetry: (model: AllowedModel) => Promise<void> | void;
};

export function GenerationSetupDialog({
    open,
    prompt,
    initialModel,
    onOpenChange,
    onRetry,
}: GenerationSetupDialogProps) {
    const {
        settings,
        initialize,
        getAvailableModels,
        updateLocalApiUrl,
        updateProviderKey,
        updatePromptDefaults,
    } = useAIStore();

    const [provider, setProvider] = useState<AIProvider>("local");
    const [apiKey, setApiKey] = useState("");
    const [localApiUrl, setLocalApiUrl] = useState("");
    const [compatibleUrl, setCompatibleUrl] = useState("");
    const [selectedModel, setSelectedModel] = useState<AllowedModel>();
    const [isConnecting, setIsConnecting] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        const nextProvider = initialModel?.provider || getConfiguredProvider(settings);
        setProvider(nextProvider);
        setSelectedModel(initialModel);
        setApiKey("");
        setLocalApiUrl(getLocalApiUrl(settings));
        setCompatibleUrl(settings?.openaiCompatibleUrl || "");
        setError(null);
    }, [initialModel, open]);

    const providerModels = useMemo(
        () => getSelectableProviderModels(settings, provider),
        [provider, settings],
    );
    const providerIsConfigured = isProviderConfigured(settings, provider);
    const selectablePrompt = useMemo(() => {
        if (!prompt) return null;
        return {
            ...prompt,
            allowedModels: providerModels.map(({ id, name, provider: modelProvider }) => ({
                id,
                name,
                provider: modelProvider,
            })),
        };
    }, [prompt, providerModels]);

    useEffect(() => {
        if (selectedModel?.provider === provider && providerModels.some(
            (model) => model.id === selectedModel.id,
        )) return;

        const firstModel = providerModels[0];
        setSelectedModel(firstModel ? {
            id: firstModel.id,
            name: firstModel.name,
            provider: firstModel.provider,
        } : undefined);
    }, [provider, providerModels, selectedModel]);

    const handleConnect = async () => {
        setIsConnecting(true);
        setError(null);
        try {
            if (provider === "local") {
                if (!localApiUrl.trim()) throw new Error("Enter the local chat API base URL.");
                await updateLocalApiUrl(localApiUrl.trim());
                const models = await getAvailableModels("local", true);
                if (models.every((model) => model.id.replace(/^local\//, "") === "local")) {
                    throw new Error("No local models were found. Start your local AI server and load a model, then try again.");
                }
            } else {
                if (!apiKey.trim()) throw new Error(`Enter your ${GENERATION_PROVIDER_LABELS[provider]} API key.`);
                await updateProviderKey(provider, apiKey.trim());
                if (provider === "openai_compatible") {
                    if (!compatibleUrl.trim()) throw new Error("Enter the OpenAI-compatible API base URL.");
                    await aiService.updateOpenAICompatibleUrl(compatibleUrl.trim());
                    await initialize();
                    await getAvailableModels(provider, true);
                }
                const models = await getAvailableModels(provider, false);
                if (models.length === 0) {
                    throw new Error(`No models were returned by ${GENERATION_PROVIDER_LABELS[provider]}.`);
                }
                setApiKey("");
            }
        } catch (connectionError) {
            setError(connectionError instanceof Error ? connectionError.message : "Could not connect to the provider.");
        } finally {
            setIsConnecting(false);
        }
    };

    const handleRefreshModels = async () => {
        setIsConnecting(true);
        setError(null);
        try {
            const models = await getAvailableModels(provider, true);
            const usableModels = provider === "local"
                ? models.filter((model) => model.id.replace(/^local\//, "") !== "local")
                : models;
            if (usableModels.length === 0) {
                throw new Error(`No models were returned by ${GENERATION_PROVIDER_LABELS[provider]}.`);
            }
        } catch (refreshError) {
            setError(refreshError instanceof Error ? refreshError.message : "Could not load models.");
        } finally {
            setIsConnecting(false);
        }
    };

    const handleRetry = async () => {
        if (!prompt || !selectedModel || getGenerationSetupIssue(settings, selectedModel)) return;

        setIsRetrying(true);
        setError(null);
        try {
            await updatePromptDefaults({
                defaultContinueWritingPromptId: prompt.id,
                defaultContinueWritingModelId: selectedModel.id,
            });
            const retry = onRetry(selectedModel);
            onOpenChange(false);
            await retry;
        } catch (retryError) {
            setError(retryError instanceof Error ? retryError.message : "Could not retry generation.");
        } finally {
            setIsRetrying(false);
        }
    };

    const retryDisabled = !prompt ||
        !selectedModel ||
        Boolean(getGenerationSetupIssue(settings, selectedModel)) ||
        isConnecting ||
        isRetrying;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg" data-testid="generation-setup-dialog">
                <DialogHeader>
                    <DialogTitle>Finish AI setup</DialogTitle>
                    <DialogDescription>
                        Simple Write needs a connected AI provider and a generation model. Your writing request is ready to retry after setup.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="generation-provider">AI provider</Label>
                        <Select
                            value={provider}
                            onValueChange={(value: AIProvider) => {
                                setProvider(value);
                                setError(null);
                            }}
                        >
                            <SelectTrigger id="generation-provider">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PROVIDERS.map((candidate) => (
                                    <SelectItem key={candidate} value={candidate}>
                                        {GENERATION_PROVIDER_LABELS[candidate]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {!providerIsConfigured && (
                        <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <KeyRound className="h-4 w-4" />
                                Connect {GENERATION_PROVIDER_LABELS[provider]}
                            </div>

                            {provider === "local" ? (
                                <div className="space-y-2">
                                    <Label htmlFor="generation-local-url">Chat API base URL</Label>
                                    <Input
                                        id="generation-local-url"
                                        value={localApiUrl}
                                        onChange={(event) => setLocalApiUrl(event.target.value)}
                                        placeholder="http://localhost:1234/v1"
                                    />
                                </div>
                            ) : (
                                <>
                                    {provider === "openai_compatible" && (
                                        <div className="space-y-2">
                                            <Label htmlFor="generation-compatible-url">API base URL</Label>
                                            <Input
                                                id="generation-compatible-url"
                                                value={compatibleUrl}
                                                onChange={(event) => setCompatibleUrl(event.target.value)}
                                                placeholder="https://example.com/v1"
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label htmlFor="generation-api-key">API key</Label>
                                        <Input
                                            id="generation-api-key"
                                            type="password"
                                            value={apiKey}
                                            onChange={(event) => setApiKey(event.target.value)}
                                            placeholder="Paste API key"
                                            autoComplete="off"
                                        />
                                    </div>
                                </>
                            )}

                            <Button type="button" variant="secondary" onClick={handleConnect} disabled={isConnecting}>
                                <RefreshCw className={`mr-2 h-4 w-4 ${isConnecting ? "animate-spin" : ""}`} />
                                {isConnecting ? "Connecting..." : "Connect and load models"}
                            </Button>
                        </div>
                    )}

                    {providerIsConfigured && prompt && selectablePrompt && (
                        <div className="space-y-2">
                            <Label>Generation model</Label>
                            {providerModels.length > 0 ? (
                                <PromptSelectMenu
                                    isLoading={false}
                                    error={null}
                                    prompts={[selectablePrompt]}
                                    promptType="continue_writing"
                                    selectedPrompt={prompt}
                                    selectedModel={selectedModel}
                                    onSelect={(_selectedPrompt, model) => setSelectedModel(model)}
                                    showConfigurePrompts={false}
                                />
                            ) : (
                                <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                                    <p className="text-sm text-muted-foreground">
                                        No models are loaded for this provider.
                                    </p>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={handleRefreshModels}
                                        disabled={isConnecting}
                                    >
                                        <RefreshCw className={`mr-2 h-4 w-4 ${isConnecting ? "animate-spin" : ""}`} />
                                        {isConnecting ? "Loading..." : "Load models"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <p className="text-sm text-destructive" role="alert">{error}</p>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isRetrying}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleRetry} disabled={retryDisabled}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        {isRetrying ? "Retrying..." : "Save and retry"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
