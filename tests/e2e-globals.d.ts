import type { StoryNexusE2EApi } from "../src/components/editor/mainLexicalEditor/testing/EditorE2EBridge";

declare global {
  interface Window {
    __STORY_NEXUS_E2E__?: StoryNexusE2EApi;
  }
}

export {};
