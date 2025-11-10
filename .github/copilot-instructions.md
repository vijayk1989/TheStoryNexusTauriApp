## Purpose
Short, practical notes to help an AI coding assistant be immediately productive in this repository.

Keep guidance factual and code-linked — prefer linking to files and small examples rather than generic rules.

## Quick dev commands (Windows / PowerShell)
- Install deps: `npm install`
- Run front-end dev server: `npm run dev` (Vite on http://localhost:5173)
- Build web assets: `npm run build` (runs `tsc && vite build`)
- Preview production bundle: `npm run preview`
- Tauri CLI wrapper: `npm run tauri <args>` — common usages:
  - `npm run tauri dev` to run the desktop app during development
  - `npm run tauri build` to produce native releases (append `-- --debug` for debug builds)

Note: Tauri builds require the Rust toolchain + `@tauri-apps/cli` (already a devDependency). If editing `src-tauri`, be careful: `Cargo.toml` contains a Windows-specific lib-name workaround (`_lib`).

## Big-picture architecture
- Frontend: React + TypeScript + Vite in `src/` (pages in `src/pages`, features under `src/features`, components under `src/components`).
- Desktop bridge: Tauri (Rust) in `src-tauri/` — small Rust glue plus `tauri.conf.json` and `Cargo.toml`.
-- Local storage: IndexedDB via Dexie (single DB instance in `src/services/database.ts`). This project no longer relies on runtime DB seeding — do NOT add or rely on automated seed steps. Initial system prompts (previously under `src/data/systemPrompts.ts`) are present but are not re-seeded automatically.
- AI integration: `src/services/ai/AIService.ts` provides the abstraction for Local, OpenAI, and OpenRouter providers. It handles model discovery, key storage in the DB (`aiSettings` table), streaming responses, and abort semantics.

Why this matters: most cross-cutting changes touch the IndexedDB schema (Dexie), AI settings, or the Tauri bridge. Search these areas first for end-to-end behavior.

## Project-specific patterns & conventions
- Path alias `@/` is used across imports (example: `import systemPrompts from '@/data/systemPrompts'`). Check `tsconfig.json` if you need to update aliases.
- Dexie schema versioning: `src/services/database.ts` uses `this.version(X).stores({...})`. When adding a new table or changing keys, increment the version and provide migrations; changing version numbers without migrating can lock out existing user data.
- IndexedDB usage: The main DB instance is `src/services/database.ts`. Tables: `stories`, `chapters`, `aiChats`, `prompts`, `aiSettings`, `lorebookEntries`, `sceneBeats`, `notes`. Use the provided helper methods (for example `getFullStory`, `createNewStory`, `deleteStoryWithRelated`) to preserve cross-table consistency.
- DB seeding removed: There is no automatic runtime reseed. Do not rely on `dbSeed.ts` to initialize production data. For local dev-only reseeds, inspect `src/services/dbSeed.ts` but prefer ad-hoc dev helpers rather than changing app startup behavior.
- AI streaming: `AIService.processStreamedResponse` implements tokenized streaming parsing (SSE style). Mirror its API (onToken/onComplete/onError) if you add providers so UI components can reuse `aiService.processStreamedResponse` consistently.
- Editor & Lexical: Lexical editor playground is in `src/Lexical/lexical-playground/`. Custom nodes are registered in `src/Lexical/lexical-playground/src/nodes/PlaygroundNodes.ts`. Scene beat nodes live in `src/Lexical/lexical-playground/src/nodes/SceneBeatNode.tsx` and are added via toolbar/slash plugins (`plugins/ToolbarPlugin`, `plugins/SlashCommandPlugin`, `plugins/SceneBeatShortcutPlugin`). Use `DecoratorNode` for complex interactive widgets (see `SceneBeatNode.decorate`).
- UI: Shadcn + Radix primitives used under `src/components/ui/`. Follow existing component patterns (props, className passthrough) when adding components.
- State: Zustand stores are used under `src/features/*/stores` (examples: `src/features/ai/stores/useAIStore.ts`, `src/features/prompts/store/promptStore.ts`). Prefer small focused stores per feature.

## Integration points to check when modifying behavior
- AI keys and model fetching: `src/services/ai/AIService.ts` (keys are persisted in `db.aiSettings`). Changing provider flows requires database changes and UI updates in `src/features/ai`.
- Export/import: prompts and story export/import logic live in `src/features/prompts` (`store/promptStore.ts`) and `src/features/lorebook` — keep JSON formats backwards compatible when changing export format.
- IndexedDB helpers: Prefer using `src/services/database.ts` helper methods rather than direct low-level operations where possible to avoid subtle inconsistencies across tables.
- Native features: any change to filesystem, native dialogs, or protocol handling will likely touch `src-tauri/` and `@tauri-apps/api` usage in the frontend.

## Small examples (copy-paste friendly)
- Fetch local models (AIService): `await aiService.getAvailableModels('local', true)` — this hits `settings.localApiUrl` and falls back to `http://localhost:1234/v1`.

-- IndexedDB quick lookup: `const prompts = await db.prompts.toArray()` or use the prompt store `await usePromptStore.getState().fetchPrompts()` to keep UI stores in-sync.

-- SceneBeat node: create a new SceneBeat node in the editor via the toolbar or typing the slash-command (implemented in `src/Lexical/lexical-playground/src/plugins`). The node's logic is in `src/Lexical/lexical-playground/src/nodes/SceneBeatNode.tsx` and it uses `sceneBeatService` to create/update `sceneBeats` in the DB.

## Key areas (focus for AI agents)
Below are the parts of the app you'll likely edit or inspect most often. I list the canonical file locations and a short note on what to check.

- SceneBeatNode
  - Path: `src/Lexical/lexical-playground/src/nodes/SceneBeatNode.tsx`
  - Notes: A `DecoratorNode` that renders `SceneBeatComponent`. Look for `createPromptConfig` which collects previous editor text using `editor.getEditorState().read(...)`, and for `generateWithPrompt`/`processStreamedResponse` calls to the AI layer. Plugins that create or interact with this node: `plugins/ToolbarPlugin`, `plugins/SlashCommandPlugin`, `plugins/SceneBeatShortcutPlugin`, and `plugins/SaveChapterContent`.

- Prompts
  - Store: `src/features/prompts/store/promptStore.ts`
  - UI: `src/features/prompts/components/PromptsManager.tsx`, `PromptForm.tsx`, `PromptList.tsx`
  - Parser: `src/features/prompts/services/promptParser.ts`
  - Notes: Prompts live in `db.prompts`. Prompt validation uses `validatePromptData` (messages must be `{role, content}` array). Prompt creation/update checks for duplicate names and enforces `isSystem` flags (system prompts are protected).

- AIService
  - Path: `src/services/ai/AIService.ts`
  - Notes: Central AI abstraction. Supports `local`, `openai`, and `openrouter`. Key behaviors:
    - Model discovery via `getAvailableModels` and provider-specific fetchers
    - Streaming parsing via `processStreamedResponse(onToken,onComplete,onError)`
    - Abort semantics via `abortController` and `abortStream()`/returning 204 on aborted flows
    - Local API default URL: `http://localhost:1234/v1` but it uses `aiSettings.localApiUrl` if set

- Brainstorm (AI chats)
  - Store: `src/features/brainstorm/stores/useBrainstormStore.ts`
  - UI: `src/features/brainstorm/components/ChatInterface.tsx`, `ChatList.tsx`
  - Notes: Uses `db.aiChats`. Supports optimistic updates for messages, chat creation, deletion, and editing. Follow the existing `updateMessage` pattern for optimistic updates followed by DB persistence.

- Lorebook
  - Store: `src/features/lorebook/stores/useLorebookStore.ts`
  - UI: `src/features/lorebook/components/*` and `pages/LorebookPage.tsx`
  - Notes: `buildTagMap` normalizes tags and skips disabled entries — this is used heavily by `SceneBeatNode` to match tags in a scene beat command. Use `getFilteredEntries` helpers to respect `isDisabled` flags.

## Where to look first when asked to implement X
- Editor/Node changes: `src/Lexical/lexical-playground/` — add nodes under `src/Lexical/lexical-playground/src/nodes/` and register them in `PlaygroundNodes.ts`.
- IndexedDB / Dexie changes: `src/services/database.ts` (update version and add migrations), and adjust stores in `src/features/*/stores` that use `db`.
- AI provider / model work: `src/services/ai/AIService.ts`, `src/features/ai/*` for UI.
- Native/Tauri issue: `src-tauri/` and `tauri.conf.json`.

## Safety & small notes for agents
- Do not change Dexie version numbers without a migration plan — that can lock out users' data.
- Avoid large, invasive Rust changes unless you can build and test locally with the Rust toolchain.
- Prefer editing/adding TypeScript under `src/` for most features; use `src-tauri/` only for explicit native needs.

---
If anything above is unclear or you want a different emphasis (for example, a short how-to for adding a Lexical node, or a migration checklist for Dexie), tell me which area to expand and I'll update this file.


---
If anything above is unclear or you want a different emphasis (e.g., more examples for AI streaming or a checklist for adding DB migrations), tell me what to expand and I will iterate.
