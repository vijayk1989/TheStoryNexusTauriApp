import { useEffect, useMemo, useRef } from "react";
import { debounce } from "lodash";
import { toast } from "react-toastify";
import { useAIStore } from "@/features/ai/stores/useAIStore";
import { resolveSavedDefaultModel } from "@/features/ai/utils/defaultModels";
import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import { sceneBeatService } from "@/features/scenebeats/services/sceneBeatService";
import { useSceneBeatGeneration } from "@/features/scenebeats/hooks/useSceneBeatGeneration";
import {
  useSBStore,
  type SceneBeatInstanceStoreApi,
} from "@/features/scenebeats/stores/useSceneBeatInstanceStore";
import { useSceneBeatStore } from "@/features/scenebeats/stores/useSceneBeatStore";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";
import type { LorebookEntry, SceneBeat } from "@/types/story";
import type { SceneBeatNodeSnapshot } from "./types";

type SceneBeatGenerationApi = ReturnType<typeof useSceneBeatGeneration>;

interface UseSceneBeatLifecycleOptions {
  initialSnapshot: SceneBeatNodeSnapshot;
  generation: SceneBeatGenerationApi;
  storeApi: SceneBeatInstanceStoreApi;
  writeNodeSnapshot: (snapshot: Partial<SceneBeatNodeSnapshot>) => void;
}

function metadataFromSceneBeat(metadata: SceneBeat["metadata"]) {
  return {
    useMatchedChapter: metadata?.useMatchedChapter ?? true,
    useMatchedSceneBeat: metadata?.useMatchedSceneBeat ?? false,
    useCustomContext: metadata?.useCustomContext ?? false,
  };
}

export function useSceneBeatLifecycle({
  initialSnapshot,
  generation,
  storeApi,
  writeNodeSnapshot,
}: UseSceneBeatLifecycleOptions) {
  const { currentStoryId, currentChapterId } = useStoryContext();
  const { currentChapter } = useChapterStore();
  const { aliasMap } = useLorebookStore();
  const settings = useAIStore((s) => s.settings);

  const sceneBeatId = useSBStore((s) => s.sceneBeatId);
  const command = useSBStore((s) => s.command);
  const collapsed = useSBStore((s) => s.collapsed);
  const povType = useSBStore((s) => s.povType);
  const povCharacter = useSBStore((s) => s.povCharacter);
  const isLoaded = useSBStore((s) => s.isLoaded);
  const streamedText = useSBStore((s) => s.streamedText);
  const streamComplete = useSBStore((s) => s.streamComplete);
  const selectedPrompt = useSBStore((s) => s.selectedPrompt);
  const selectedPipeline = useSBStore((s) => s.selectedPipeline);
  const agenticMode = useSBStore((s) => s.agenticMode);
  const useMatchedChapter = useSBStore((s) => s.useMatchedChapter);
  const useMatchedSceneBeat = useSBStore((s) => s.useMatchedSceneBeat);
  const useCustomContext = useSBStore((s) => s.useCustomContext);
  const set = useSBStore((s) => s.set);

  const didHydrateSnapshot = useRef(false);
  const lastPersistedCommand = useRef<string | null>(null);
  const lastPersistedMetadata = useRef<string | null>(null);

  useEffect(() => {
    if (didHydrateSnapshot.current) return;
    didHydrateSnapshot.current = true;

    const metadata = initialSnapshot.metadata;
    const hasSnapshotData =
      initialSnapshot.command !== undefined ||
      initialSnapshot.povType !== undefined ||
      initialSnapshot.povCharacter !== undefined ||
      initialSnapshot.generatedContent !== undefined ||
      initialSnapshot.accepted !== undefined ||
      initialSnapshot.metadata !== undefined ||
      initialSnapshot.collapsed !== undefined;

    if (!hasSnapshotData) return;

    const pov = initialSnapshot.povType || currentChapter?.povType || "Third Person Omniscient";
    const char = initialSnapshot.povCharacter ?? (initialSnapshot.povType ? undefined : currentChapter?.povCharacter);
    const generatedContent = initialSnapshot.generatedContent || "";
    const accepted = initialSnapshot.accepted || false;
    const hydratedCommand = initialSnapshot.command || "";
    const hydratedMetadata = metadataFromSceneBeat(metadata);

    lastPersistedCommand.current = hydratedCommand;
    lastPersistedMetadata.current = JSON.stringify(hydratedMetadata);

    set({
      sceneBeatId: initialSnapshot.sceneBeatId || "",
      command: hydratedCommand,
      collapsed: initialSnapshot.collapsed || false,
      povType: pov,
      povCharacter: char,
      tempPovType: pov,
      tempPovCharacter: char,
      streamedText: accepted ? "" : generatedContent,
      streamComplete: Boolean(generatedContent && !accepted),
      ...hydratedMetadata,
      isLoaded: false,
    });

  }, [initialSnapshot, currentChapter, set]);

  useEffect(() => {
    generation.fetchPrompts().catch((error: unknown) => {
      toast.error("Failed to load prompts");
      console.error("Error loading prompts:", error);
    });
  }, [generation.fetchPrompts]);

  useEffect(() => {
    if (generation.prompts.length > 0 && !selectedPrompt && settings?.enablePromptDefaults) {
      const defaultPrompt = settings.defaultSceneBeatPromptId
        ? generation.prompts.find((prompt) => prompt.id === settings.defaultSceneBeatPromptId)
        : generation.prompts.find((prompt) => prompt.promptType === "scene_beat");
      if (defaultPrompt) {
        const defaultModel = resolveSavedDefaultModel(settings, settings.defaultSceneBeatModelId);
        set({ selectedPrompt: defaultPrompt, selectedModel: defaultModel });
      }
    }
  }, [generation.prompts, selectedPrompt, settings, set]);

  useEffect(() => {
    if (!agenticMode) return;

    generation.getAvailablePipelines()
      .then((pipelines: any) => {
        set({ availablePipelines: pipelines });
        if (pipelines.length > 0 && !selectedPipeline) {
          set({ selectedPipeline: pipelines[0] });
        }
      })
      .catch((error: unknown) => {
        console.error("Error loading pipelines:", error);
        toast.error("Failed to load AI pipelines");
      });
  }, [agenticMode, generation.getAvailablePipelines, selectedPipeline, set]);

  useEffect(() => {
    const loadOrCreate = async () => {
      const currentState = storeApi.getState();
      if (currentState.isLoaded) return;

      const effectiveSceneBeatId = currentState.sceneBeatId || initialSnapshot.sceneBeatId || sceneBeatId;

      if (effectiveSceneBeatId) {
        try {
          const store = useSceneBeatStore.getState();
          const data = store.getCachedSceneBeat(effectiveSceneBeatId) || await store.getSceneBeat(effectiveSceneBeatId);
          if (!data) {
            if (!currentStoryId || !currentChapterId) return;

            const pov = initialSnapshot.povType || currentChapter?.povType || "Third Person Omniscient";
            const char = initialSnapshot.povCharacter ?? (initialSnapshot.povType ? undefined : currentChapter?.povCharacter);
            const metadata = initialSnapshot.metadata || {
              useMatchedChapter: true,
              useMatchedSceneBeat: false,
              useCustomContext: false,
            };
            const replacementId = await store.createSceneBeat({
              storyId: currentStoryId,
              chapterId: currentChapterId,
              command: initialSnapshot.command || "",
              povType: pov,
              povCharacter: char,
              generatedContent: initialSnapshot.generatedContent,
              accepted: initialSnapshot.accepted,
              metadata,
            });
            const hydratedMetadata = metadataFromSceneBeat(metadata);

            lastPersistedCommand.current = initialSnapshot.command || "";
            lastPersistedMetadata.current = JSON.stringify(hydratedMetadata);

            set({
              sceneBeatId: replacementId,
              command: initialSnapshot.command || "",
              povType: pov,
              povCharacter: char,
              tempPovType: pov,
              tempPovCharacter: char,
              streamedText: initialSnapshot.accepted ? "" : initialSnapshot.generatedContent || "",
              streamComplete: Boolean(initialSnapshot.generatedContent && !initialSnapshot.accepted),
              ...hydratedMetadata,
              isLoaded: true,
            });

            writeNodeSnapshot({
              sceneBeatId: replacementId,
              command: initialSnapshot.command || "",
              povType: pov,
              povCharacter: char,
              generatedContent: initialSnapshot.generatedContent,
              accepted: initialSnapshot.accepted,
              metadata,
              collapsed: initialSnapshot.collapsed,
            });
            return;
          }

          const pov = data.povType || currentChapter?.povType || "Third Person Omniscient";
          const char = data.povCharacter ?? (data.povType ? undefined : currentChapter?.povCharacter);
          const generatedContent = data.generatedContent || "";
          const accepted = data.accepted || false;
          const metadata = data.metadata;
          const hydratedMetadata = metadataFromSceneBeat(metadata);
          const storedCommand = data.command || "";
          const snapshotCommand = initialSnapshot.command || "";
          const hydratedCommand = storedCommand || snapshotCommand;

          lastPersistedCommand.current = hydratedCommand;
          lastPersistedMetadata.current = JSON.stringify(hydratedMetadata);

          set({
            sceneBeatId: data.id,
            command: hydratedCommand,
            povType: pov,
            povCharacter: char,
            tempPovType: pov,
            tempPovCharacter: char,
            streamedText: accepted ? "" : generatedContent,
            streamComplete: Boolean(generatedContent && !accepted),
            ...hydratedMetadata,
            isLoaded: true,
          });

          writeNodeSnapshot({
            sceneBeatId: data.id,
            command: hydratedCommand,
            povType: pov,
            povCharacter: char,
            generatedContent,
            accepted,
            metadata,
          });

          if (hydratedCommand !== storedCommand) {
            const repairedSceneBeat = { ...data, command: hydratedCommand };
            useSceneBeatStore.getState().upsertSceneBeat(repairedSceneBeat);
            sceneBeatService.updateSceneBeat(data.id, { command: hydratedCommand }).catch((error: unknown) => {
              console.error("Error repairing SceneBeat command from chapter snapshot:", error);
            });
          }
        } catch (error) {
          console.error("Error loading SceneBeat:", error);
        }
      } else if (currentStoryId && currentChapterId) {
        try {
          const currentCommand = storeApi.getState().command || initialSnapshot.command || "";
          const pov = currentChapter?.povType || "Third Person Omniscient";
          const char = currentChapter?.povCharacter;
          const newId = await useSceneBeatStore.getState().createSceneBeat({
            storyId: currentStoryId,
            chapterId: currentChapterId,
            command: currentCommand,
            povType: pov,
            povCharacter: char,
          });

          writeNodeSnapshot({
            sceneBeatId: newId,
            command: currentCommand,
            povType: pov,
            povCharacter: char,
            metadata: {
              useMatchedChapter: true,
              useMatchedSceneBeat: false,
              useCustomContext: false,
            },
            collapsed: false,
          });

          set({
            sceneBeatId: newId,
            command: currentCommand,
            povType: pov,
            povCharacter: char,
            tempPovType: pov,
            tempPovCharacter: char,
            useMatchedChapter: true,
            useMatchedSceneBeat: false,
            useCustomContext: false,
            isLoaded: true,
          });

          lastPersistedCommand.current = currentCommand;
          lastPersistedMetadata.current = JSON.stringify({
            useMatchedChapter: true,
            useMatchedSceneBeat: false,
            useCustomContext: false,
          });
        } catch (error) {
          console.error("Error creating SceneBeat:", error);
        }
      }
    };

    loadOrCreate();
  }, [
    sceneBeatId,
    currentStoryId,
    currentChapterId,
    currentChapter,
    isLoaded,
    set,
    writeNodeSnapshot,
    storeApi,
    initialSnapshot,
  ]);

  const saveCommand = useMemo(
    () =>
      debounce(async (id: string, cmd: string) => {
        if (!id) return;
        try {
          await sceneBeatService.updateSceneBeat(id, { command: cmd });
          const cached = useSceneBeatStore.getState().getCachedSceneBeat(id);
          if (cached) {
            useSceneBeatStore.getState().upsertSceneBeat({ ...cached, command: cmd });
          }
        } catch (error) {
          console.error("Error saving SceneBeat command:", error);
        }
      }, 500),
    []
  );

  useEffect(
    () => () => {
      saveCommand.flush();
    },
    [saveCommand]
  );

  useEffect(() => {
    if (!sceneBeatId || !isLoaded) return;

    writeNodeSnapshot({ command });
    if (lastPersistedCommand.current !== command) {
      lastPersistedCommand.current = command;
      saveCommand(sceneBeatId, command);
    }
  }, [command, sceneBeatId, saveCommand, isLoaded, writeNodeSnapshot]);

  useEffect(() => {
    if (!sceneBeatId || !isLoaded || !streamComplete) return;

    writeNodeSnapshot({
      generatedContent: streamedText,
      accepted: false,
    });

    const cached = useSceneBeatStore.getState().getCachedSceneBeat(sceneBeatId);
    if (cached) {
      useSceneBeatStore.getState().upsertSceneBeat({
        ...cached,
        generatedContent: streamedText,
        accepted: false,
      });
    }
  }, [streamComplete, streamedText, sceneBeatId, isLoaded, writeNodeSnapshot]);

  useEffect(() => {
    const matchAliases = () => {
      const matched = new Map<string, LorebookEntry>();
      Object.entries(aliasMap).forEach(([alias, entry]) => {
        if (command.toLowerCase().includes(alias.toLowerCase())) {
          matched.set(entry.id, entry);
        }
      });
      set({ localMatchedEntries: matched });
    };

    const debounced = debounce(matchAliases, 500);
    debounced();
    return () => debounced.cancel();
  }, [command, aliasMap, set]);

  useEffect(() => {
    if (!sceneBeatId || !isLoaded) return;

    const metadata = { useMatchedChapter, useMatchedSceneBeat, useCustomContext };
    writeNodeSnapshot({ metadata });
    const metadataKey = JSON.stringify(metadata);
    if (lastPersistedMetadata.current === metadataKey) return;

    lastPersistedMetadata.current = metadataKey;
    sceneBeatService.updateSceneBeat(sceneBeatId, { metadata }).catch((error: unknown) => {
      console.error("Error updating toggle states:", error);
    });

    const cached = useSceneBeatStore.getState().getCachedSceneBeat(sceneBeatId);
    if (cached) {
      useSceneBeatStore.getState().upsertSceneBeat({ ...cached, metadata });
    }
  }, [useMatchedChapter, useMatchedSceneBeat, useCustomContext, sceneBeatId, isLoaded, writeNodeSnapshot]);

  useEffect(() => {
    if (!useCustomContext) {
      set({ includeAllLorebook: false, selectedItems: [] });
    }
  }, [useCustomContext, set]);

  useEffect(() => {
    if (!sceneBeatId || !isLoaded) return;

    writeNodeSnapshot({
      collapsed,
      povType,
      povCharacter,
    });

    const cached = useSceneBeatStore.getState().getCachedSceneBeat(sceneBeatId);
    if (cached) {
      useSceneBeatStore.getState().upsertSceneBeat({ ...cached, povType, povCharacter });
    }
  }, [collapsed, povType, povCharacter, sceneBeatId, isLoaded, writeNodeSnapshot]);
}
