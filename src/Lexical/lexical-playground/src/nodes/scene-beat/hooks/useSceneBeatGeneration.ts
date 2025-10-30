import { useState } from "react";
import type { AllowedModel, PromptMessage } from "@/types/story";
import { useAIStore } from "@/features/ai/stores/useAIStore";
import { toast } from "react-toastify";
import { createPromptParser } from "@/features/prompts/services/promptParser";
import type { PromptParserConfig } from "@/types/story";
import { attemptPromise } from '@jfdi/attempt';

interface UseSceneBeatGenerationResult {
  streaming: boolean;
  streamedText: string;
  streamComplete: boolean;
  previewMessages: PromptMessage[] | undefined;
  previewLoading: boolean;
  previewError: string | null;
  generateWithConfig: (config: PromptParserConfig, model: AllowedModel | undefined) => Promise<void>;
  previewPrompt: (config: PromptParserConfig) => Promise<void>;
  stopGeneration: () => void;
  resetGeneration: () => void;
}

/**
 * Custom hook to manage AI generation, streaming, and prompt preview.
 * Handles stream management, abort logic, and error handling.
 *
 * @returns Generation state and control functions
 */
export const useSceneBeatGeneration = (): UseSceneBeatGenerationResult => {
  const [streaming, setStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [streamComplete, setStreamComplete] = useState(false);
  const [previewMessages, setPreviewMessages] = useState<PromptMessage[] | undefined>();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const { generateWithPrompt, processStreamedResponse, abortGeneration } = useAIStore();

  const generateWithConfig = async (
    config: PromptParserConfig,
    model: AllowedModel | undefined
  ): Promise<void> => {
    if (!model) {
      toast.error("Please select a model");
      return;
    }

    setStreaming(true);
    setStreamedText("");
    setStreamComplete(false);

    const [error] = await attemptPromise(async () => {
      const response = await generateWithPrompt(config, model);

      // Handle aborted responses (204) similar to the chat interface
      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to generate response");
      }

      if (response.status === 204) {
        // Generation was aborted
        return;
      }

      await processStreamedResponse(
        response,
        (token) => {
          setStreamedText((prev) => prev + token);
        },
        () => {
          setStreamComplete(true);
        },
        (error) => {
          console.error("Error streaming response:", error);
          toast.error("Failed to generate text");
        }
      );
    });
    if (error) {
      console.error("Error generating text:", error);
      toast.error("Failed to generate text");
    }
    setStreaming(false);
  };

  const previewPrompt = async (config: PromptParserConfig): Promise<void> => {
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewMessages(undefined);

    const promptParser = createPromptParser();

    const [error, parsedPrompt] = await attemptPromise(async () =>
      promptParser.parse(config)
    );
    if (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setPreviewError(errorMessage);
      toast.error(`Error previewing prompt: ${errorMessage}`);
      setPreviewLoading(false);
      return;
    }

    if (parsedPrompt.error) {
      setPreviewError(parsedPrompt.error);
      toast.error(`Error parsing prompt: ${parsedPrompt.error}`);
      setPreviewLoading(false);
      return;
    }

    setPreviewMessages(parsedPrompt.messages);
    setPreviewLoading(false);
  };

  const stopGeneration = () => {
    abortGeneration();
    setStreaming(false);
  };

  const resetGeneration = () => {
    setStreamedText("");
    setStreamComplete(false);
  };

  return {
    streaming,
    streamedText,
    streamComplete,
    previewMessages,
    previewLoading,
    previewError,
    generateWithConfig,
    previewPrompt,
    stopGeneration,
    resetGeneration,
  };
};
