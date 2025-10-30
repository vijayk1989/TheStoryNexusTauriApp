import { useMemo } from "react";
import { debounce } from "lodash";
import { sceneBeatService } from "@/features/scenebeats/services/sceneBeatService";
import type { SceneBeat } from "@/types/story";
import { attemptPromise } from '@jfdi/attempt';

const DEBOUNCE_DELAY_MS = 500;

/**
 * Custom hook to provide debounced database sync functions for scene beat.
 * Replaces useEffect antipattern by providing explicit save functions
 * to be called from event handlers.
 *
 * @param sceneBeatId - ID of the scene beat to sync
 * @returns Debounced save functions for various scene beat properties
 */
export const useSceneBeatSync = (sceneBeatId: string) => {
  // Create debounced save functions using useMemo to maintain stable references
  const saveCommand = useMemo(
    () =>
      debounce(async (command: string) => {
        if (!sceneBeatId) return;

        const [error] = await attemptPromise(async () =>
          sceneBeatService.updateSceneBeat(sceneBeatId, { command })
        );
        if (error) {
          console.error("Error saving SceneBeat command:", error);
        }
      }, DEBOUNCE_DELAY_MS),
    [sceneBeatId]
  );

  const saveToggles = useMemo(
    () =>
      debounce(
        async (
          useMatchedChapter: boolean,
          useMatchedSceneBeat: boolean,
          useCustomContext: boolean
        ) => {
          if (!sceneBeatId) return;

          const updatedSceneBeat: Partial<SceneBeat> = {
            metadata: {
              useMatchedChapter,
              useMatchedSceneBeat,
              useCustomContext,
            },
          };
          const [error] = await attemptPromise(async () =>
            sceneBeatService.updateSceneBeat(sceneBeatId, updatedSceneBeat)
          );
          if (error) {
            console.error("Error updating scene beat toggle states:", error);
          }
        },
        DEBOUNCE_DELAY_MS
      ),
    [sceneBeatId]
  );

  const savePOVSettings = async (
    povType:
      | "First Person"
      | "Third Person Limited"
      | "Third Person Omniscient"
      | undefined,
    povCharacter: string | undefined
  ) => {
    if (!sceneBeatId) return;

    const [error] = await attemptPromise(async () =>
      sceneBeatService.updateSceneBeat(sceneBeatId, {
        povType,
        povCharacter,
      })
    );
    if (error) {
      console.error("Error saving POV settings:", error);
    }
  };

  const saveGeneratedContent = async (
    generatedContent: string,
    accepted: boolean
  ) => {
    if (!sceneBeatId) return;

    const [error] = await attemptPromise(async () =>
      sceneBeatService.updateSceneBeat(sceneBeatId, {
        generatedContent,
        accepted,
      })
    );
    if (error) {
      console.error("Error saving generated content:", error);
    }
  };

  const saveAccepted = async (accepted: boolean) => {
    if (!sceneBeatId) return;

    const [error] = await attemptPromise(async () =>
      sceneBeatService.updateSceneBeat(sceneBeatId, { accepted })
    );
    if (error) {
      console.error("Error updating accepted status:", error);
    }
  };

  return {
    saveCommand,
    saveToggles,
    savePOVSettings,
    saveGeneratedContent,
    saveAccepted,
  };
};
