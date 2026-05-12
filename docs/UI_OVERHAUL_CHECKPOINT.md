# The Story Nexus UI Overhaul Checkpoint

Last updated: 2026-05-11

This document captures how the app currently works before a full UI overhaul. It is based on the current code, not only the README, which is useful but behind the implementation in a few places.

## Product Shape

The Story Nexus is a local-first desktop writing app built with Tauri, React, TypeScript, Tailwind, Shadcn/Radix UI, Zustand, Dexie/IndexedDB, and Lexical. The core promise is an AI-assisted creative writing workspace where a writer can manage stories, chapters, lore, reusable prompts, brainstorm chats, agent pipelines, drafts, notes, and generated prose.

The app is organized around a story dashboard. A story contains chapters and story-scoped creative context. The chapter editor is the densest workspace: it embeds the Lexical editor and exposes side panels for matched lorebook tags, outline, POV, timeline extraction, chapter notes, drafts, saved chats, brainstorm, lorebook, prompts, prompt defaults, AI settings, and guides.

## Current Navigation

Top-level routes are defined in `src/main.tsx`.

- `/` is a simple landing page with links to stories, AI settings, and guide.
- `/stories` shows the story library.
- `/ai-settings` manages AI providers and models.
- `/guide` shows built-in usage guides.
- `/dashboard/:storyId` wraps story-specific sections in `StoryDashboard`.
- `/dashboard/:storyId/chapters` lists chapters.
- `/dashboard/:storyId/chapters/:chapterId` opens the main editor.
- `/dashboard/:storyId/lorebook`, `/prompts`, `/brainstorm`, `/notes`, and `/agents` expose story-scoped tooling.

There are two navigation shells:

- `MainLayout` for global pages, with a narrow desktop icon rail and mobile bottom tab bar.
- `StoryDashboard` for story pages, with a collapsible desktop sidebar and mobile navigation sheet.

For the overhaul, this means navigation already distinguishes global app areas from per-story workspaces. A cleaner IA should preserve that distinction but can consolidate repeated shell patterns.

## Data Model And Persistence

Persistence is local-first through Dexie in `src/services/database.ts`, using the `StoryDatabase` IndexedDB database. The current schema version is 15.

Main tables:

- `stories`: story metadata such as title, author, language, synopsis.
- `chapters`: ordered story chapters with Lexical JSON content, summary, outline, POV, notes, and word count.
- `aiChats`: brainstorm and saved AI chat transcripts.
- `prompts`: system and user prompts with messages, allowed models, sampling settings, and parallel model options.
- `aiSettings`: provider keys, local/custom endpoints, fetched model list, favorites, Tavily key, and prompt defaults.
- `lorebookEntries`: story knowledge base entries with category, tags, description, metadata, and disabled state.
- `templates`: reusable chat insertion snippets.
- `sceneBeats`: embedded editor commands and generated text tied to a story/chapter.
- `drafts`: persisted AI-generated prose candidates.
- `notes`, `agentPresets`, `pipelinePresets`, `pipelineExecutions`: supporting writing and agent orchestration data.

Most features follow this pattern:

1. A Zustand store owns UI-facing state.
2. The store reads/writes Dexie tables directly or through a small service.
3. Components render from the store and call actions.
4. Long-running AI flows stream text through `AIService` and then persist final state.

Deletion is partly cascading. `deleteStoryWithRelated` removes story, chapters, lorebook entries, AI chats, scene beats, and drafts. It does not currently include every table that has optional `storyId` fields, such as prompts, templates, notes, agent presets, or pipeline presets.

## Story And Chapter Flow

Stories are managed by `useStoryStore`, backed by `db.stories`. A story is a lightweight container. `db.getFullStory` currently returns the story plus ordered chapters.

Chapters are managed by `useChapterStore`, backed by `db.chapters`.

Important chapter behavior:

- Chapters are ordered and can be drag-reordered in the chapter list.
- Each chapter stores Lexical editor state as JSON in `content`.
- `wordCount` is recalculated from serialized content using a simple split when content changes.
- Chapter outline and chapter notes are stored as nested objects with `content` and `lastUpdated`.
- POV is stored per chapter as `povType` and optional `povCharacter`.
- The last edited chapter is stored in `localStorage` per story and surfaced in story navigation.
- Helper methods extract plain text from Lexical JSON for prompt context and export/generation workflows.

The chapter creation flow includes title and POV selection. Character POV choices depend on lorebook entries in the `character` category.

## Story Editor Workspace

The main editor component is `StoryEditor`. It combines:

- `EmbeddedPlayground`, which wraps the imported Lexical playground app.
- A desktop right rail of editor tools.
- Mobile menu access to the same tools.
- Drawers and sheets for secondary workflows.
- Brainstorm access from the editor tools rail.

The editor tools currently include:

- Matched Tags
- Chapter Outline
- Edit POV
- Extract Timeline
- Chapter Notes
- Download
- Drafts
- Brainstorm
- Lorebook
- Prompts
- Prompt Defaults
- AI Settings
- Guide

This is the main UI-overhaul hotspot. The current implementation exposes many powerful capabilities, but they are presented as a long button grid plus many side sheets. A redesigned workspace should likely separate writing, context, generation, and management tasks into clearer regions or modes.

## Lexical Editor Integration

The writing surface lives under `src/Lexical/lexical-playground`. It is a customized embedded Lexical playground rather than a small purpose-built editor.

Key app-specific plugins/nodes:

- `LoadChapterContentPlugin` loads `currentChapter.content` into Lexical when a chapter opens.
- `SaveChapterContentPlugin` serializes editor state to JSON and debounced-saves it to the chapter after editor updates.
- `LorebookTagPlugin` scans editor text against the lorebook tag map and updates `chapterMatchedEntries`.
- `SceneBeatShortcutPlugin` inserts a `SceneBeatNode` with the keyboard shortcut, currently documented as Alt/Option + S in the README.
- `SceneBeatNode` is a DecoratorNode that renders a full AI command panel inside the editor.

The editor is therefore not only a prose editor. It is also a host for inline AI commands, contextual lore matching, and generated prose insertion.

## Lorebook

The lorebook is a story-specific knowledge base managed by `useLorebookStore`.

Entry categories:

- `character`
- `location`
- `item`
- `event`
- `note`
- `synopsis`
- `starting scenario`
- `timeline`

Each entry has a name, description, tags, optional metadata, and `isDisabled`. Disabled entries are excluded from tag maps and most context helpers.

Important lorebook behavior:

- `buildTagMap` maps entry names and tags to entries for case-insensitive matching.
- Multi-word tags are kept as full tags; individual words are only added if also explicitly present as standalone tags.
- The editor-level `LorebookTagPlugin` matches lorebook tags in chapter text and stores chapter matches in `chapterMatchedEntries`.
- Scene beats also match tags locally against the scene beat command.
- Prompt parsing can include matched chapter entries, scene beat entries, all entries, entries by category, character lookup, and timeline-filtered context.
- Timeline entries with `metadata.chapterOrder` are filtered out if they are in the future relative to the current chapter.
- Lorebook import/export uses JSON with `{ version, type: "lorebook", entries }`.
- Brainstorm responses can be parsed for JSON lorebook entries and passed into `CreateEntryDialog`.

The lorebook UI exists as both a full page and a compact editor sheet. The full page includes category tabs and a special timeline view. The editor panel groups entries by category and supports create, edit, delete, enable, and disable.

## Prompts

Prompts are managed by `usePromptStore` and parsed by `PromptParser`.

A prompt contains:

- name and optional description
- `promptType`
- ordered chat messages with roles
- allowed models
- temperature, max tokens, top-p, top-k, repetition penalty, min-p
- optional multi-model comparison configuration
- optional story scope
- `isSystem`

Prompt types currently include:

- `scene_beat`
- `gen_summary`
- `selection_specific`
- `continue_writing`
- `brainstorm`
- `other`

System prompts are seeded when the database is first populated. User prompts can be created, edited, cloned, deleted, imported, and exported. Prompt import excludes system status and generates new IDs.

`PromptForm` is both a prompt editor and model selector. It loads available models from the AI store, groups them by provider/favorites, lets users favorite models, and supports selecting 2-3 parallel comparison models.

Prompt defaults live in `AISettings` and can set default scene beat prompt/model choices.

## Prompt Variables

`PromptParser` resolves `{{variable}}` placeholders and a few function-style placeholders before sending messages to AI.

Important variables include:

- `{{scenebeat}}`
- `{{previous_words}}` and `{{previous_words(1000)}}`
- `{{summaries}}`
- `{{pov}}`
- `{{chapter_content}}`
- `{{selected_text}}` / `{{selection}}`
- `{{story_language}}`
- `{{matched_entries_chapter}}`
- `{{lorebook_chapter_matched_entries}}`
- `{{lorebook_scenebeat_matched_entries}}`
- `{{scenebeat_context}}`
- `{{brainstorm_context}}`
- `{{all_entries}}` and category-specific variants like `{{all_characters}}`
- `{{character Name}}`
- `{{chapter_outline}}`
- `{{chapter_data(1)}}`
- `{{chat_history}}`
- `{{user_input}}`

This parser is a central contract for UI overhaul work. Prompt editing, preview, scene beat generation, and brainstorm all rely on these variables being explainable and discoverable.

## AI Integration

AI is split across `AIService` and `useAIStore`.

Supported providers:

- OpenAI
- OpenRouter
- local OpenAI-compatible server, defaulting to `http://localhost:1234/v1`
- custom OpenAI-compatible endpoint
- NanoGPT
- Google Gemini via `@google/genai`

AI settings include provider keys, available model cache, local/custom endpoint URLs, favorites, prompt defaults, and Tavily key.

Generation flow:

1. UI selects a prompt and model.
2. `useAIStore.generateWithPrompt` builds parsed messages using `PromptParser`.
3. The store reads prompt sampling settings from IndexedDB.
4. The request is dispatched to provider-specific methods on `AIService`.
5. Provider streams are normalized to an SSE-like `Response`.
6. `processStreamedResponse` extracts content deltas and sends tokens to the UI.
7. `abortGeneration` aborts the active stream through `AbortController`.

Provider-specific notes:

- OpenAI, OpenRouter, NanoGPT use the OpenAI SDK with browser access enabled.
- Custom OpenAI-compatible and local generation use `fetch`.
- Google streams are wrapped into the same SSE-like response shape.
- Tool call deltas are forwarded in the stream; brainstorm uses this for Tavily web search.

Security/design implication: API keys are stored locally in IndexedDB and SDKs run client-side. The app is local-first desktop software, but the settings UI should still make provider/account boundaries very clear.

## Brainstorm

Brainstorm is story-scoped chat stored in `aiChats` and managed by `useBrainstormStore`.

Core behavior:

- A story can have multiple brainstorm chats.
- Chats have title, messages, created/updated timestamps.
- The selected chat is held in store.
- The current input draft is preserved in store while moving around.
- Messages can be edited after creation with original content metadata retained.

`BrainstormPanel` provides chat selection and new-chat creation. `ChatInterface` is the heavy workspace.

Brainstorm context controls include:

- Include full context.
- Include all lorebook entries.
- Select chapter summaries.
- Select full chapter content.
- Select lorebook items.
- Include chat history.
- Optional web search.

Standard brainstorm generation uses a `brainstorm` prompt and the selected model. It passes chat history and selected context through `additionalContext`, then `PromptParser` resolves `{{brainstorm_context}}`.

Agentic brainstorm mode bypasses normal prompt/model selection and runs a selected pipeline through `useAgenticGeneration`. It has progress and diagnostics UI.

Web search mode adds a `search_web` tool for supported providers. If the streamed response contains a tool call, `ChatInterface` executes Tavily search through `executeTavilySearch`, injects tool result messages, and calls generation again without tools to get the final answer.

Brainstorm also supports reusable insertion templates through the template store and dialogs, plus a built-in lorebook JSON template for asking AI to output structured entries.

## Scene Beats

Scene beats are inline AI command blocks embedded in the Lexical document.

Data lives in the `sceneBeats` table:

- story ID
- chapter ID
- command text
- POV override
- generated content
- accepted status
- metadata for context toggles

The Lexical `SceneBeatNode` stores only the scene beat ID in serialized editor JSON. The richer state is persisted separately in IndexedDB.

Scene beat lifecycle:

1. User inserts a SceneBeat node in the editor.
2. The node renders `SceneBeatComponent`, which creates a per-instance Zustand store.
3. If the node has no scene beat ID, it creates a database row using the current story/chapter.
4. The command textarea is debounced-saved to the row.
5. The command is scanned against lorebook tags for local matches.
6. User selects prompt/model or an agent pipeline.
7. Generation streams into the scene beat panel.
8. Accept inserts generated prose as a paragraph after the scene beat node.
9. Reject clears the streamed text.
10. Delete removes the database row and the Lexical node.

Scene beat generation modes:

- Standard prompt generation through `generateWithParsedMessages`.
- Regeneration with previous messages, previous response, and a user refinement.
- Agentic pipeline generation through `useAgenticGeneration`.
- Parallel generation through `useParallelGeneration`, showing multiple model responses in a drawer.

Scene beat context can include:

- previous editor text before the node
- chapter matched lorebook entries
- scene-beat-command matched lorebook entries
- manually selected lorebook entries
- chapter POV or scene beat POV override
- chapter summary and outline through prompt variables

This is the most distinctive interaction in the app and should probably remain a first-class concept in the new UI, even if its visual form changes.

## Agents And Pipelines

Agent orchestration is present as a major supporting system. The type model defines agent presets, pipeline presets, pipeline steps, step conditions, revision loops, diagnostics, and execution history.

Agent roles include summarizer, prose writer, lore judge, continuity checker, style editor, dialogue specialist, expander, outline generator, style extractor, scene beat generator, refusal checker, and custom.

The checkpoint focus is UI overhaul, so the key implication is that generation is no longer only single prompt -> single model. The interface must support:

- direct prompt/model generation
- parallel model comparison
- multi-step pipelines
- diagnostics/progress
- revision/validation concepts

## Current UI Architecture Observations

The app has a rich feature set, but the UI is currently assembled feature-by-feature. This creates several overhaul opportunities:

- The editor right rail is overloaded and mixes writing aids, settings, knowledge management, generation, help, and export.
- Many panels are implemented as sheets/drawers with different widths and slightly different structures.
- The same capabilities appear in multiple places: lorebook full page vs editor panel, prompts full page vs editor panel, brainstorm full page vs editor sheet, AI settings page vs editor sheet.
- Prompt/model selection appears in scene beats, brainstorm, and prompt forms with overlapping but distinct UI needs.
- The app has two navigation shells and several mobile strategies that could be harmonized.
- Context selection is powerful but scattered; the writer must understand lorebook matches, selected items, full context, chapter summaries, previous words, and prompt variables.
- Lexical playground code is large and not fully tailored to the app, so editor UI work needs careful boundaries.

## UI Overhaul Constraints To Preserve

Do not lose these behaviors while redesigning:

- Local-first data model and IndexedDB persistence.
- Story-scoped dashboard navigation.
- Chapter order, summary, outline, notes, POV, and last-edited tracking.
- Lexical JSON chapter content compatibility.
- Debounced autosave.
- Lorebook tag matching in chapter text.
- Scene beat nodes serialized inside chapter content with separate DB state.
- Prompt parser variable compatibility.
- Prompt preview before generation.
- Provider/model/favorite/prompt-default settings.
- Streaming generation and stop/abort behavior.
- Brainstorm chat persistence and editable assistant messages.
- Context selection for brainstorm and scene beats.
- Import/export for prompts and lorebook.
- Agentic and parallel generation paths.

## Recommended Overhaul Framing

For design planning, think of the app as four connected workspaces:

1. Library: stories, imports/exports, global AI settings, guide.
2. Story Control Room: chapters, lorebook, prompts, agents, notes, brainstorm.
3. Writing Studio: chapter editor, context awareness, scene beats, brainstorm, drafts.
4. AI Configuration Layer: providers, models, prompts, defaults, pipelines, diagnostics.

The current code already supports this mental model. The overhaul should mostly clarify surfaces, hierarchy, and repeated interaction patterns rather than rewrite the feature architecture immediately.

## High-Risk Areas For UI Refactor

- `StoryEditor`: many panels and current mobile/desktop branching.
- `ChatInterface`: very large component with chat, context selection, generation, tool search, templates, message editing, and agentic mode all in one place.
- `SceneBeatNode`: UI, persistence, per-instance state, AI generation, prompt editing, and Lexical insertion are tightly coupled.
- `PromptForm`: combines message authoring, model picking, sampling settings, favorites, and parallel model setup.
- Embedded Lexical playground: app-specific behavior is mixed into an upstream playground structure.

## Useful Source Map

- Routes: `src/main.tsx`
- Global shell: `src/components/MainLayout.tsx`
- Story shell: `src/features/stories/pages/StoryDashboard.tsx`
- Database: `src/services/database.ts`
- Shared types: `src/types/story.ts`
- Story store: `src/features/stories/stores/useStoryStore.ts`
- Chapter store: `src/features/chapters/stores/useChapterStore.ts`
- Editor shell: `src/features/chapters/components/StoryEditor.tsx`
- Embedded editor wrapper: `src/Lexical/lexical-playground/src/EmbeddedPlayground.tsx`
- Editor save/load: `src/Lexical/lexical-playground/src/plugins/SaveChapterContent`, `src/Lexical/lexical-playground/src/plugins/LoadChapterContent`
- Lorebook tag matching: `src/Lexical/lexical-playground/src/plugins/LorebookTagPlugin`
- Scene beat node: `src/Lexical/lexical-playground/src/nodes/SceneBeatNode.tsx`
- Scene beat generation hook: `src/features/scenebeats/hooks/useSceneBeatGeneration.ts`
- Scene beat service/store: `src/features/scenebeats/services/sceneBeatService.ts`, `src/features/scenebeats/stores/useSceneBeatStore.ts`
- Lorebook store/page/panel: `src/features/lorebook/stores/useLorebookStore.ts`, `src/features/lorebook/pages/LorebookPage.tsx`, `src/features/lorebook/components/LorebookPanel.tsx`
- Prompts store/form/parser: `src/features/prompts/store/promptStore.ts`, `src/features/prompts/components/PromptForm.tsx`, `src/features/prompts/services/promptParser.ts`
- AI service/store/settings: `src/services/ai/AIService.ts`, `src/features/ai/stores/useAIStore.ts`, `src/features/ai/components/AISettingsPanel.tsx`
- Brainstorm store/panel/chat: `src/features/brainstorm/stores/useBrainstormStore.ts`, `src/features/brainstorm/components/BrainstormPanel.tsx`, `src/features/brainstorm/components/ChatInterface.tsx`
