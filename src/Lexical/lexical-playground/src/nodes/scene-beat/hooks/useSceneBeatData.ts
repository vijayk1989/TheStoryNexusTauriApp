import { useState, useEffect } from "react";
import type { LexicalEditor, NodeKey } from "lexical";
import { $getNodeByKey } from "lexical";
import { sceneBeatService } from "@/features/scenebeats/services/sceneBeatService";
import type { POVType } from "../components/POVSettingsPopover";
import { attemptPromise } from '@jfdi/attempt';

// Type guard for SceneBeatNode (duck typing to avoid circular dependency)
interface SceneBeatNodeType {
  getSceneBeatId(): string;
  setSceneBeatId(id: string): void;
}

const isSceneBeatNode = (node: unknown): node is SceneBeatNodeType => {
  return (
    typeof node === "object" &&
    node !== null &&
    "getSceneBeatId" in node &&
    "setSceneBeatId" in node &&
    typeof (node as SceneBeatNodeType).getSceneBeatId === "function" &&
    typeof (node as SceneBeatNodeType).setSceneBeatId === "function"
  );
};

interface UseSceneBeatDataProps {
  editor: LexicalEditor;
  nodeKey: NodeKey;
  currentStoryId: string | null;
  currentChapterId: string | null;
  defaultPovType?: POVType;
  defaultPovCharacter?: string;
}

interface UseSceneBeatDataResult {
  sceneBeatId: string;
  isLoaded: boolean;
  initialCommand: string;
  initialPovType: POVType | undefined;
  initialPovCharacter: string | undefined;
  useMatchedChapter: boolean;
  useMatchedSceneBeat: boolean;
  useCustomContext: boolean;
}

/**
 * Custom hook to handle scene beat data loading and initialization.
 * Consolidates all data loading into a single initialization point.
 * Replaces multiple scattered useEffect hooks with single async initialization.
 *
 * @param props - Configuration including editor, node key, and context IDs
 * @returns Scene beat data and loading state
 */
export const useSceneBeatData = ({
  editor,
  nodeKey,
  currentStoryId,
  currentChapterId,
  defaultPovType = "Third Person Omniscient",
  defaultPovCharacter,
}: UseSceneBeatDataProps): UseSceneBeatDataResult => {
  const [sceneBeatId, setSceneBeatId] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [initialCommand, setInitialCommand] = useState("");
  const [initialPovType, setInitialPovType] = useState<POVType | undefined>(
    defaultPovType
  );
  const [initialPovCharacter, setInitialPovCharacter] = useState<
    string | undefined
  >(defaultPovCharacter);
  const [useMatchedChapter, setUseMatchedChapter] = useState(true);
  const [useMatchedSceneBeat, setUseMatchedSceneBeat] = useState(false);
  const [useCustomContext, setUseCustomContext] = useState(false);

  useEffect(() => {
    const loadOrCreateSceneBeat = async () => {
      if (isLoaded) return;

      // Step 1: Get sceneBeatId from the node
      let nodeSceneBeatId = "";
      editor.getEditorState().read(() => {
        const node = $getNodeByKey(nodeKey);
        if (isSceneBeatNode(node)) {
          nodeSceneBeatId = node.getSceneBeatId();
        }
      });

      if (nodeSceneBeatId) {
        // Step 2: Load existing SceneBeat
        const [loadError, data] = await attemptPromise(async () =>
          sceneBeatService.getSceneBeat(nodeSceneBeatId)
        );
        if (loadError) {
          console.error("Error loading SceneBeat:", loadError);
        } else if (data) {
          setInitialCommand(data.command || "");
          setInitialPovType(data.povType || defaultPovType);
          setInitialPovCharacter(data.povCharacter || defaultPovCharacter);

          // Load toggle states from metadata
          if (data.metadata) {
            if (typeof data.metadata.useMatchedChapter === "boolean") {
              setUseMatchedChapter(data.metadata.useMatchedChapter);
            }
            if (typeof data.metadata.useMatchedSceneBeat === "boolean") {
              setUseMatchedSceneBeat(data.metadata.useMatchedSceneBeat);
            }
            if (typeof data.metadata.useCustomContext === "boolean") {
              setUseCustomContext(data.metadata.useCustomContext);
            }
          }

          setSceneBeatId(nodeSceneBeatId);
          setIsLoaded(true);
        }
      } else if (currentStoryId && currentChapterId) {
        // Step 3: Create new SceneBeat
        const [createError, newId] = await attemptPromise(async () =>
          sceneBeatService.createSceneBeat({
            storyId: currentStoryId,
            chapterId: currentChapterId,
            command: "",
            povType: defaultPovType,
            povCharacter: defaultPovCharacter,
          })
        );
        if (createError) {
          console.error("Error creating SceneBeat:", createError);
        } else {
          // Update the node with the new ID
          editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (isSceneBeatNode(node)) {
              node.setSceneBeatId(newId);
            }
          });

          setSceneBeatId(newId);
          setInitialCommand("");
          setInitialPovType(defaultPovType);
          setInitialPovCharacter(defaultPovCharacter);
          setIsLoaded(true);
        }
      }
    };

    loadOrCreateSceneBeat();
  }, [
    editor,
    nodeKey,
    currentStoryId,
    currentChapterId,
    defaultPovType,
    defaultPovCharacter,
    isLoaded,
  ]);

  return {
    sceneBeatId,
    isLoaded,
    initialCommand,
    initialPovType,
    initialPovCharacter,
    useMatchedChapter,
    useMatchedSceneBeat,
    useCustomContext,
  };
};
