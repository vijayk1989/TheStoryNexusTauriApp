/**
 * Compact AI Settings panel for the Story Editor sidebar Sheet.
 * Mirrors AISettingsPage functionality in a narrower layout.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { aiService } from "@/services/ai/AIService";
import { toast } from "react-toastify";
import type { AIModel } from "@/types/story";
import { cn } from "@/lib/utils";

type ProviderType =
  | "openai"
  | "openrouter"
  | "nanogpt"
  | "local"
  | "openai_compatible";

export function AISettingsPanel() {
  const [openaiKey, setOpenaiKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [nanogptKey, setNanogptKey] = useState("");
  const [openaiCompatibleKey, setOpenaiCompatibleKey] = useState("");
  const [openaiCompatibleUrl, setOpenaiCompatibleUrl] = useState("");
  const [openaiCompatibleModelsRoute, setOpenaiCompatibleModelsRoute] =
    useState("");
  const [localApiUrl, setLocalApiUrl] = useState("http://localhost:1234/v1");
  const [loadingProvider, setLoadingProvider] = useState<ProviderType | null>(
    null,
  );
  const [models, setModels] = useState<Record<string, AIModel[]>>({
    openai: [],
    openrouter: [],
    nanogpt: [],
    local: [],
    openai_compatible: [],
  });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  const clearProviderKeyInput = (provider: ProviderType) => {
    switch (provider) {
      case "openai":
        setOpenaiKey("");
        break;
      case "openrouter":
        setOpenrouterKey("");
        break;
      case "nanogpt":
        setNanogptKey("");
        break;
      case "openai_compatible":
        setOpenaiCompatibleKey("");
        break;
      default:
        break;
    }
  };

  const loadInitialData = async () => {
    try {
      await aiService.initialize();

      const ocUrl = aiService.getOpenAICompatibleUrl();
      const ocRoute = aiService.getOpenAICompatibleModelsRoute();
      const lUrl = aiService.getLocalApiUrl();

      if (ocUrl) setOpenaiCompatibleUrl(ocUrl);
      if (ocRoute) setOpenaiCompatibleModelsRoute(ocRoute);
      if (lUrl) setLocalApiUrl(lUrl);

      const allModels = await aiService.getAvailableModels(undefined, false);
      setModels({
        openai: allModels.filter((m) => m.provider === "openai"),
        openrouter: allModels.filter((m) => m.provider === "openrouter"),
        nanogpt: allModels.filter((m) => m.provider === "nanogpt"),
        local: allModels.filter((m) => m.provider === "local"),
        openai_compatible: allModels.filter(
          (m) => m.provider === "openai_compatible",
        ),
      });
    } catch (error) {
      console.error("Error loading AI settings:", error);
      toast.error("Failed to load AI settings");
    }
  };

  const handleKeyUpdate = async (provider: ProviderType, key: string) => {
    if (provider !== "local" && !key.trim()) return;
    setLoadingProvider(provider);
    try {
      await aiService.updateKey(provider, key);
      const fetched = await aiService.getAvailableModels(provider, true);
      setModels((prev) => ({ ...prev, [provider]: fetched }));
      setOpenSections((prev) => ({ ...prev, [`${provider}_models`]: true }));
      if (provider !== "local") {
        clearProviderKeyInput(provider);
      }
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
      setModels((prev) => ({ ...prev, [provider]: fetched }));
      setOpenSections((prev) => ({ ...prev, [`${provider}_models`]: true }));
      toast.success(`${providerLabel(provider)} models refreshed`);
    } catch {
      toast.error(`Failed to refresh ${providerLabel(provider)} models`);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleLocalUrlUpdate = async (url: string) => {
    if (!url.trim()) return;
    setLoadingProvider("local");
    try {
      await aiService.updateLocalApiUrl(url);
      const fetched = await aiService.getAvailableModels("local", true);
      setModels((prev) => ({ ...prev, local: fetched }));
      setOpenSections((prev) => ({ ...prev, local_models: true }));
      toast.success("Local API URL updated");
    } catch {
      toast.error("Failed to update local API URL");
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleCompatibleUrlUpdate = async (url: string) => {
    if (!url.trim()) return;
    setLoadingProvider("openai_compatible");
    try {
      await aiService.updateOpenAICompatibleUrl(url);
      const fetched = await aiService.getAvailableModels(
        "openai_compatible",
        true,
      );
      setModels((prev) => ({ ...prev, openai_compatible: fetched }));
      setOpenSections((prev) => ({ ...prev, openai_compatible_models: true }));
      toast.success("OpenAI-compatible URL updated");
    } catch {
      toast.error("Failed to update URL");
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleCompatibleModelsRouteUpdate = async (route: string) => {
    setLoadingProvider("openai_compatible");
    try {
      await aiService.updateOpenAICompatibleModelsRoute(route);
      toast.success("Models route updated");
    } catch {
      toast.error("Failed to update models route");
    } finally {
      setLoadingProvider(null);
    }
  };

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const isLoading = (provider: ProviderType) => loadingProvider === provider;

  return (
    <div className="space-y-4">
      {/* Local Models */}
      <ProviderSection
        title="Local Models"
        description="LM Studio / Ollama"
        open={openSections.local}
        onToggle={() => toggleSection("local")}
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
              disabled={isLoading("local") || !localApiUrl.trim()}
            >
              {isLoading("local") ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => handleRefresh("local")}
            disabled={isLoading("local")}
          >
            {isLoading("local") ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Refresh Models
          </Button>
          <ModelList
            models={models.local}
            open={openSections.local_models}
            onToggle={() => toggleSection("local_models")}
          />
        </div>
      </ProviderSection>

      {/* OpenAI */}
      <ProviderSection
        title="OpenAI"
        open={openSections.openai}
        onToggle={() => toggleSection("openai")}
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
                onClick={() => handleKeyUpdate("openai", openaiKey)}
                disabled={isLoading("openai") || !openaiKey.trim()}
              >
                {isLoading("openai") ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => handleRefresh("openai")}
            disabled={isLoading("openai")}
          >
            {isLoading("openai") ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Refresh Models
          </Button>
          <ModelList
            models={models.openai}
            open={openSections.openai_models}
            onToggle={() => toggleSection("openai_models")}
          />
        </div>
      </ProviderSection>

      {/* OpenRouter */}
      <ProviderSection
        title="OpenRouter"
        open={openSections.openrouter}
        onToggle={() => toggleSection("openrouter")}
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
                onClick={() => handleKeyUpdate("openrouter", openrouterKey)}
                disabled={isLoading("openrouter") || !openrouterKey.trim()}
              >
                {isLoading("openrouter") ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => handleRefresh("openrouter")}
            disabled={isLoading("openrouter")}
          >
            {isLoading("openrouter") ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Refresh Models
          </Button>
          <ModelList
            models={models.openrouter}
            open={openSections.openrouter_models}
            onToggle={() => toggleSection("openrouter_models")}
          />
        </div>
      </ProviderSection>

      {/* NanoGPT */}
      <ProviderSection
        title="NanoGPT"
        open={openSections.nanogpt}
        onToggle={() => toggleSection("nanogpt")}
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
                onClick={() => handleKeyUpdate("nanogpt", nanogptKey)}
                disabled={isLoading("nanogpt") || !nanogptKey.trim()}
              >
                {isLoading("nanogpt") ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => handleRefresh("nanogpt")}
            disabled={isLoading("nanogpt")}
          >
            {isLoading("nanogpt") ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Refresh Models
          </Button>
          <ModelList
            models={models.nanogpt}
            open={openSections.nanogpt_models}
            onToggle={() => toggleSection("nanogpt_models")}
          />
        </div>
      </ProviderSection>

      {/* OpenAI-Compatible */}
      <ProviderSection
        title="OpenAI-Compatible"
        open={openSections.openai_compatible}
        onToggle={() => toggleSection("openai_compatible")}
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
                disabled={
                  isLoading("openai_compatible") || !openaiCompatibleUrl.trim()
                }
              >
                {isLoading("openai_compatible") ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Save"
                )}
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
                onClick={() =>
                  handleKeyUpdate("openai_compatible", openaiCompatibleKey)
                }
                disabled={
                  isLoading("openai_compatible") || !openaiCompatibleKey.trim()
                }
              >
                {isLoading("openai_compatible") ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Save"
                )}
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
                onClick={() =>
                  handleCompatibleModelsRouteUpdate(openaiCompatibleModelsRoute)
                }
                disabled={isLoading("openai_compatible")}
              >
                {isLoading("openai_compatible") ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => handleRefresh("openai_compatible")}
            disabled={
              isLoading("openai_compatible") || !openaiCompatibleUrl.trim()
            }
          >
            {isLoading("openai_compatible") ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Refresh Models
          </Button>
          <ModelList
            models={models.openai_compatible}
            open={openSections.openai_compatible_models}
            onToggle={() => toggleSection("openai_compatible_models")}
          />
        </div>
      </ProviderSection>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────

function providerLabel(provider: ProviderType): string {
  switch (provider) {
    case "openai":
      return "OpenAI";
    case "openrouter":
      return "OpenRouter";
    case "nanogpt":
      return "NanoGPT";
    case "local":
      return "Local";
    case "openai_compatible":
      return "OpenAI-Compatible";
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
        <ChevronRight
          className={cn(
            "h-4 w-4 transition-transform flex-shrink-0",
            open && "rotate-90",
          )}
        />
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
        <ChevronRight
          className={cn("h-3 w-3 transition-transform", open && "rotate-90")}
        />
        {models.length} model{models.length !== 1 ? "s" : ""} available
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 space-y-0.5 max-h-[200px] overflow-y-auto">
        {models.map((model) => (
          <div
            key={model.id}
            className="text-xs pl-5 py-0.5 text-muted-foreground truncate"
          >
            {model.name}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
