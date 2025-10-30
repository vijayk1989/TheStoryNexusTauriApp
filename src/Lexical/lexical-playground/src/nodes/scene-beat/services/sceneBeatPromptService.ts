import type {
  LorebookEntry,
  Prompt,
  PromptParserConfig,
} from "@/types/story";
import type { LexicalEditor, NodeKey } from "lexical";
import { extractPreviousText } from "./lexicalEditorUtils";

export interface SceneBeatContext {
  useMatchedChapter: boolean;
  useMatchedSceneBeat: boolean;
  useCustomContext: boolean;
  customContextItems: string[];
}

/**
 * Creates a prompt configuration for scene beat generation.
 *
 * @param editor - The Lexical editor instance
 * @param nodeKey - The key of the scene beat node
 * @param prompt - The selected prompt template
 * @param params - Parameters for prompt configuration
 * @returns Prompt parser configuration object
 */
export const createPromptConfig = (
  editor: LexicalEditor,
  nodeKey: NodeKey,
  prompt: Prompt,
  params: {
    storyId: string;
    chapterId: string;
    command: string;
    povType:
      | "First Person"
      | "Third Person Limited"
      | "Third Person Omniscient"
      | undefined;
    povCharacter: string | undefined;
    chapterMatchedEntries: Map<string, LorebookEntry> | undefined;
    localMatchedEntries: Map<string, LorebookEntry>;
    sceneBeatContext: SceneBeatContext;
    selectedItems: LorebookEntry[];
  }
): PromptParserConfig => {
  const {
    storyId,
    chapterId,
    command,
    povType,
    povCharacter,
    chapterMatchedEntries,
    localMatchedEntries,
    sceneBeatContext,
    selectedItems,
  } = params;

  // Extract previous text from editor
  const previousText = extractPreviousText(editor, nodeKey);

  // Create a combined set of matched entries based on the toggle states
  const combinedMatchedEntries = new Set<LorebookEntry>();

  // Only include chapter matched entries if the toggle is enabled
  if (sceneBeatContext.useMatchedChapter && chapterMatchedEntries) {
    chapterMatchedEntries.forEach((entry) => {
      combinedMatchedEntries.add(entry);
    });
  }

  // Only include scene beat matched entries if the toggle is enabled
  if (sceneBeatContext.useMatchedSceneBeat && localMatchedEntries) {
    localMatchedEntries.forEach((entry) => {
      combinedMatchedEntries.add(entry);
    });
  }

  return {
    promptId: prompt.id,
    storyId,
    chapterId,
    scenebeat: command.trim(),
    previousWords: previousText,
    matchedEntries: combinedMatchedEntries,
    chapterMatchedEntries: new Set(
      chapterMatchedEntries ? Array.from(chapterMatchedEntries.values()) : []
    ),
    sceneBeatMatchedEntries: new Set(Array.from(localMatchedEntries.values())),
    povType,
    povCharacter:
      povType !== "Third Person Omniscient" ? povCharacter : undefined,
    sceneBeatContext: {
      useMatchedChapter: sceneBeatContext.useMatchedChapter,
      useMatchedSceneBeat: sceneBeatContext.useMatchedSceneBeat,
      useCustomContext: sceneBeatContext.useCustomContext,
      customContextItems: sceneBeatContext.useCustomContext
        ? selectedItems.map((item) => item.id)
        : [],
    },
  };
};
