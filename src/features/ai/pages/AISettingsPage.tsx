import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, Loader2 } from "lucide-react";
import { aiService } from "@/services/ai/AIService";
import { toast } from "react-toastify";
import { AIModel } from "@/types/story";
import { cn } from "@/lib/utils";

export default function AISettingsPage() {
  const [openaiKey, setOpenaiKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [nanogptKey, setNanogptKey] = useState("");
  const [openaiCompatibleKey, setOpenaiCompatibleKey] = useState("");
  const [openaiCompatibleUrl, setOpenaiCompatibleUrl] = useState("");
  const [openaiCompatibleModelsRoute, setOpenaiCompatibleModelsRoute] =
    useState("");
  const [localApiUrl, setLocalApiUrl] = useState("http://localhost:1234/v1");
  const [isLoading, setIsLoading] = useState(false);
  const [openaiModels, setOpenaiModels] = useState<AIModel[]>([]);
  const [openrouterModels, setOpenrouterModels] = useState<AIModel[]>([]);
  const [nanogptModels, setNanogptModels] = useState<AIModel[]>([]);
  const [openaiCompatibleModels, setOpenaiCompatibleModels] = useState<
    AIModel[]
  >([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      console.log("[AISettingsPage] Initializing AI service");
      await aiService.initialize();

      // Set the keys using the new getter methods
      const openaiKey = aiService.getOpenAIKey();
      const openrouterKey = aiService.getOpenRouterKey();
      const nanogptKey = aiService.getNanoGPTKey();
      const openaiCompatibleKey = aiService.getOpenAICompatibleKey();
      const openaiCompatibleUrl = aiService.getOpenAICompatibleUrl();
      const openaiCompatibleModelsRoute =
        aiService.getOpenAICompatibleModelsRoute();
      const localApiUrl = aiService.getLocalApiUrl();

      console.log("[AISettingsPage] Retrieved API keys and URL from service");
      if (openaiKey) setOpenaiKey(openaiKey);
      if (openrouterKey) setOpenrouterKey(openrouterKey);
      if (nanogptKey) setNanogptKey(nanogptKey);
      if (openaiCompatibleKey) setOpenaiCompatibleKey(openaiCompatibleKey);
      if (openaiCompatibleUrl) setOpenaiCompatibleUrl(openaiCompatibleUrl);
      if (openaiCompatibleModelsRoute)
        setOpenaiCompatibleModelsRoute(openaiCompatibleModelsRoute);
      if (localApiUrl) setLocalApiUrl(localApiUrl);

      console.log("[AISettingsPage] Getting all available models");
      // Don't force refresh on initial load to avoid unnecessary API calls
      const allModels = await aiService.getAvailableModels(undefined, false);
      console.log(`[AISettingsPage] Received ${allModels.length} total models`);

      const localModels = allModels.filter((m) => m.provider === "local");
      const openaiModels = allModels.filter((m) => m.provider === "openai");
      const openrouterModels = allModels.filter(
        (m) => m.provider === "openrouter",
      );
      const nanogptModels = allModels.filter((m) => m.provider === "nanogpt");
      const openaiCompatibleModels = allModels.filter(
        (m) => m.provider === "openai_compatible",
      );

      console.log(
        `[AISettingsPage] Filtered models - Local: ${localModels.length}, OpenAI: ${openaiModels.length}, OpenRouter: ${openrouterModels.length}, NanoGPT: ${nanogptModels.length}`,
      );

      setOpenaiModels(openaiModels);
      setOpenrouterModels(openrouterModels);
      setNanogptModels(nanogptModels);
      setOpenaiCompatibleModels(openaiCompatibleModels);
    } catch (error) {
      console.error("Error loading AI settings:", error);
      toast.error("Failed to load AI settings");
    }
  };

  const handleKeyUpdate = async (
    provider:
      | "openai"
      | "openrouter"
      | "nanogpt"
      | "local"
      | "openai_compatible",
    key: string,
  ) => {
    if (provider !== "local" && !key.trim()) return;

    setIsLoading(true);
    console.log(`[AISettingsPage] Updating key for provider: ${provider}`);
    try {
      await aiService.updateKey(provider, key);
      console.log(
        `[AISettingsPage] Key updated for ${provider}, fetching models`,
      );
      const models = await aiService.getAvailableModels(provider);
      console.log(
        `[AISettingsPage] Received ${models.length} models for ${provider}`,
      );

      if (provider === "openai") {
        setOpenaiModels(models);
        setOpenSections((prev) => ({ ...prev, openai: true }));
      } else if (provider === "openrouter") {
        setOpenrouterModels(models);
        setOpenSections((prev) => ({ ...prev, openrouter: true }));
      } else if (provider === "nanogpt") {
        setNanogptModels(models);
        setOpenSections((prev) => ({ ...prev, nanogpt: true }));
      } else if (provider === "openai_compatible") {
        setOpenaiCompatibleModels(models);
        setOpenSections((prev) => ({ ...prev, openai_compatible: true }));
      } else if (provider === "local") {
        console.log(
          `[AISettingsPage] Updating local models, received ${models.length} models`,
        );
        setOpenaiModels((prev) => {
          const filtered = prev.filter((m) => m.provider !== "local");
          console.log(
            `[AISettingsPage] Filtered out ${prev.length - filtered.length} old local models`,
          );
          const newModels = [...filtered, ...models];
          console.log(
            `[AISettingsPage] New models array has ${newModels.length} models`,
          );
          return newModels;
        });
        setOpenSections((prev) => ({ ...prev, local: true }));
      }

      toast.success(
        `${provider === "openai" ? "OpenAI" : provider === "openrouter" ? "OpenRouter" : provider === "nanogpt" ? "NanoGPT" : provider === "openai_compatible" ? "OpenAI-compatible" : "Local"} models updated successfully`,
      );
    } catch (error) {
      toast.error(`Failed to update ${provider} models`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshModels = async (
    provider:
      | "openai"
      | "openrouter"
      | "nanogpt"
      | "local"
      | "openai_compatible",
  ) => {
    setIsLoading(true);
    console.log(`[AISettingsPage] Refreshing models for provider: ${provider}`);
    try {
      // Force refresh by passing true as the second parameter
      const models = await aiService.getAvailableModels(provider, true);
      console.log(
        `[AISettingsPage] Received ${models.length} models for ${provider}`,
      );

      switch (provider) {
        case "openai":
          setOpenaiModels(models);
          setOpenSections((prev) => ({ ...prev, openai: true }));
          break;
        case "openrouter":
          setOpenrouterModels(models);
          setOpenSections((prev) => ({ ...prev, openrouter: true }));
          break;
        case "nanogpt":
          setNanogptModels(models);
          setOpenSections((prev) => ({ ...prev, nanogpt: true }));
          break;
        case "openai_compatible":
          setOpenaiCompatibleModels(models);
          setOpenSections((prev) => ({ ...prev, openai_compatible: true }));
          break;
        case "local":
          console.log(
            `[AISettingsPage] Updating local models, received ${models.length} models`,
          );
          setOpenaiModels((prev) => {
            const filtered = prev.filter((m) => m.provider !== "local");
            console.log(
              `[AISettingsPage] Filtered out ${prev.length - filtered.length} old local models`,
            );
            const newModels = [...filtered, ...models];
            console.log(
              `[AISettingsPage] New models array has ${newModels.length} models`,
            );
            return newModels;
          });
          setOpenSections((prev) => ({ ...prev, local: true }));
          break;
      }

      toast.success(
        `${provider === "openai" ? "OpenAI" : provider === "openrouter" ? "OpenRouter" : "Local"} models refreshed`,
      );
    } catch (error) {
      console.error(`Error refreshing ${provider} models:`, error);
      toast.error(`Failed to refresh ${provider} models`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocalApiUrlUpdate = async (url: string) => {
    if (!url.trim()) return;

    setIsLoading(true);
    console.log(`[AISettingsPage] Updating local API URL to: ${url}`);
    try {
      await aiService.updateLocalApiUrl(url);
      console.log(`[AISettingsPage] Local API URL updated, fetching models`);
      // Force refresh by passing true as the second parameter
      const models = await aiService.getAvailableModels("local", true);
      console.log(`[AISettingsPage] Received ${models.length} local models`);

      setOpenaiModels((prev) => {
        const filtered = prev.filter((m) => m.provider !== "local");
        console.log(
          `[AISettingsPage] Filtered out ${prev.length - filtered.length} old local models`,
        );
        const newModels = [...filtered, ...models];
        console.log(
          `[AISettingsPage] New models array has ${newModels.length} models`,
        );
        return newModels;
      });
      setOpenSections((prev) => ({ ...prev, local: true }));

      toast.success("Local API URL updated successfully");
    } catch (error) {
      console.error("Error updating local API URL:", error);
      toast.error("Failed to update local API URL");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAICompatibleUrlUpdate = async (url: string) => {
    if (!url.trim()) return;

    setIsLoading(true);
    console.log(
      `[AISettingsPage] Updating OpenAI-compatible API URL to: ${url}`,
    );
    try {
      await aiService.updateOpenAICompatibleUrl(url);
      console.log(
        "[AISettingsPage] OpenAI-compatible URL updated, fetching models",
      );
      const models = await aiService.getAvailableModels(
        "openai_compatible",
        true,
      );
      console.log(
        `[AISettingsPage] Received ${models.length} openai_compatible models`,
      );
      setOpenaiCompatibleModels(models);
      setOpenSections((prev) => ({ ...prev, openai_compatible: true }));
      toast.success("OpenAI-compatible URL updated successfully");
    } catch (error) {
      console.error("Error updating OpenAI-compatible URL:", error);
      toast.error("Failed to update OpenAI-compatible URL");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAICompatibleModelsRouteUpdate = async (route: string) => {
    setIsLoading(true);
    console.log(
      `[AISettingsPage] Updating OpenAI-compatible models route to: ${route}`,
    );
    try {
      await aiService.updateOpenAICompatibleModelsRoute(route);
      console.log("[AISettingsPage] OpenAI-compatible models route updated");
      toast.success("Models route updated successfully");
    } catch (error) {
      console.error("Error updating OpenAI-compatible models route:", error);
      toast.error("Failed to update models route");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">AI Settings</h1>

        <div className="space-y-6">
          {/* OpenAI Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                OpenAI Configuration
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRefreshModels("openai")}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Refresh Models"
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="openai-key">OpenAI API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="Enter your OpenAI API key"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                  />
                  <Button
                    onClick={() => handleKeyUpdate("openai", openaiKey)}
                    disabled={isLoading || !openaiKey.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </div>

              {openaiModels.length > 0 && (
                <Collapsible
                  open={openSections.openai}
                  onOpenChange={() => toggleSection("openai")}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 transition-transform",
                        openSections.openai && "transform rotate-90",
                      )}
                    />
                    Available Models
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {openaiModels.map((model) => (
                      <div key={model.id} className="text-sm pl-6">
                        {model.name}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>

          {/* OpenAI-Compatible Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                OpenAI-compatible Endpoint
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRefreshModels("openai_compatible")}
                  disabled={isLoading || !openaiCompatibleUrl.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Refresh Models"
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="openai-compatible-url">Endpoint URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="openai-compatible-url"
                    type="text"
                    placeholder="https://your-openai-compatible.example/v1"
                    value={openaiCompatibleUrl}
                    onChange={(e) => setOpenaiCompatibleUrl(e.target.value)}
                  />
                  <Button
                    onClick={() =>
                      handleOpenAICompatibleUrlUpdate(openaiCompatibleUrl)
                    }
                    disabled={isLoading || !openaiCompatibleUrl.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the base URL for your OpenAI-compatible service (must
                  support /models and /chat/completions).
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="openai-compatible-key">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="openai-compatible-key"
                    type="password"
                    placeholder="Enter your API key"
                    value={openaiCompatibleKey}
                    onChange={(e) => setOpenaiCompatibleKey(e.target.value)}
                  />
                  <Button
                    onClick={() =>
                      handleKeyUpdate("openai_compatible", openaiCompatibleKey)
                    }
                    disabled={isLoading || !openaiCompatibleKey.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="openai-compatible-models-route">
                  Custom Models API Route (optional)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="openai-compatible-models-route"
                    type="text"
                    placeholder="e.g., /v1/models or /api/models (leave empty for default)"
                    value={openaiCompatibleModelsRoute}
                    onChange={(e) =>
                      setOpenaiCompatibleModelsRoute(e.target.value)
                    }
                  />
                  <Button
                    onClick={() =>
                      handleOpenAICompatibleModelsRouteUpdate(
                        openaiCompatibleModelsRoute,
                      )
                    }
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  If your API uses a non-standard route for fetching models,
                  specify it here. Otherwise, the default /models endpoint will
                  be used.
                </p>
              </div>

              {openaiCompatibleModels.length > 0 && (
                <Collapsible
                  open={openSections.openai_compatible}
                  onOpenChange={() => toggleSection("openai_compatible")}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 transition-transform",
                        openSections.openai_compatible && "transform rotate-90",
                      )}
                    />
                    Available Models
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {openaiCompatibleModels.map((model) => (
                      <div key={model.id} className="text-sm pl-6">
                        {model.name}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>

          {/* OpenRouter Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                OpenRouter Configuration
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRefreshModels("openrouter")}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Refresh Models"
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="openrouter-key">OpenRouter API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="openrouter-key"
                    type="password"
                    placeholder="Enter your OpenRouter API key"
                    value={openrouterKey}
                    onChange={(e) => setOpenrouterKey(e.target.value)}
                  />
                  <Button
                    onClick={() => handleKeyUpdate("openrouter", openrouterKey)}
                    disabled={isLoading || !openrouterKey.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </div>

              {openrouterModels.length > 0 && (
                <Collapsible
                  open={openSections.openrouter}
                  onOpenChange={() => toggleSection("openrouter")}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 transition-transform",
                        openSections.openrouter && "transform rotate-90",
                      )}
                    />
                    Available Models
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {openrouterModels.map((model) => (
                      <div key={model.id} className="text-sm pl-6">
                        {model.name}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>

          {/* NanoGPT Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                NanoGPT Configuration
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRefreshModels("nanogpt")}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Refresh Models"
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="nanogpt-key">NanoGPT API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="nanogpt-key"
                    type="password"
                    placeholder="Enter your NanoGPT API key"
                    value={nanogptKey}
                    onChange={(e) => setNanogptKey(e.target.value)}
                  />
                  <Button
                    onClick={() => handleKeyUpdate("nanogpt", nanogptKey)}
                    disabled={isLoading || !nanogptKey.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </div>

              {nanogptModels.length > 0 && (
                <Collapsible
                  open={openSections.nanogpt}
                  onOpenChange={() => toggleSection("nanogpt")}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 transition-transform",
                        openSections.nanogpt && "transform rotate-90",
                      )}
                    />
                    Available Models
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {nanogptModels.map((model) => (
                      <div key={model.id} className="text-sm pl-6">
                        {model.name}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>

          {/* Local Models Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Local Models
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRefreshModels("local")}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Refresh Models"
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Models from LM Studio
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleKeyUpdate("local", "")}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Refresh Models"
                  )}
                </Button>
              </div>

              <Collapsible
                open={openSections.localAdvanced}
                onOpenChange={() => toggleSection("localAdvanced")}
              >
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 transition-transform",
                      openSections.localAdvanced && "transform rotate-90",
                    )}
                  />
                  Advanced Settings
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  <div className="grid gap-2">
                    <Label htmlFor="local-api-url">Local API URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="local-api-url"
                        type="text"
                        placeholder="http://localhost:1234/v1"
                        value={localApiUrl}
                        onChange={(e) => setLocalApiUrl(e.target.value)}
                      />
                      <Button
                        onClick={() => handleLocalApiUrlUpdate(localApiUrl)}
                        disabled={isLoading || !localApiUrl.trim()}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The URL of your local LLM server. Default is
                      http://localhost:1234/v1
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible
                open={openSections.local}
                onOpenChange={() => toggleSection("local")}
              >
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 transition-transform",
                      openSections.local && "transform rotate-90",
                    )}
                  />
                  Available Models
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {openaiModels
                    .filter((m) => m.provider === "local")
                    .map((model) => (
                      <div key={model.id} className="text-sm pl-6">
                        {model.name}
                      </div>
                    ))}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
