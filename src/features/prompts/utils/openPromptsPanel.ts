const OPEN_PROMPTS_PANEL_EVENT = "story-nexus:open-prompts-panel";

export function openPromptsPanel() {
    window.dispatchEvent(new CustomEvent(OPEN_PROMPTS_PANEL_EVENT));
}

export function addOpenPromptsPanelListener(listener: () => void) {
    window.addEventListener(OPEN_PROMPTS_PANEL_EVENT, listener);
    return () => window.removeEventListener(OPEN_PROMPTS_PANEL_EVENT, listener);
}
