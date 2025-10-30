import type { POVType } from "../components/POVSettingsPopover";

/**
 * UI state for the scene beat component
 */
export interface SceneBeatUIState {
  collapsed: boolean;
  showMatchedEntries: boolean;
  showPreviewDialog: boolean;
}

/**
 * Context toggle states for scene beat generation
 */
export interface SceneBeatContextState {
  useMatchedChapter: boolean;
  useMatchedSceneBeat: boolean;
  useCustomContext: boolean;
}

/**
 * POV settings for scene beat
 */
export interface SceneBeatPOVState {
  povType: POVType | undefined;
  povCharacter: string | undefined;
}
