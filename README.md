# The Story Nexus

Version: `1.0.0`

The Story Nexus is a local-first desktop writing app for long-form fiction. It combines a chapter-focused editor with story context, lorebook matching, reusable AI prompts, brainstorm chats, and multi-agent generation pipelines.

The current app is intentionally editor-first: open the app, choose or create a story, choose a chapter, and write. Supporting tools live in the left story/chapter rail and the right editor tool rail instead of separate dashboard pages.

## Highlights

- **Editor-first workspace**: manage stories and chapters from the left rail while keeping the chapter editor as the main surface.
- **Autosaving Lexical editor**: chapter content is saved frequently, with a visible saved/saving state in the editor top bar.
- **Story and chapter management**: create, rename, reorder, summarize, import, export, and delete stories or chapters.
- **Scene beats**: insert inline AI command blocks in the editor with `Alt+S` or `Option+S`, then generate, revise, compare models, or run an agent pipeline.
- **Lorebook**: store characters, locations, items, events, notes, synopsis, starting scenario, and timeline entries. Matching tags are surfaced while you write.
- **Brainstorm**: keep story-scoped brainstorm chats, add context, rename or delete chats from the chat selector, and optionally use agentic generation.
- **Prompts and defaults**: manage reusable prompts, import/export prompt packs, and set default models for scene beats, brainstorm, and agents.
- **Agents and pipelines**: build reusable AI workers and multi-step workflows such as summarize -> draft -> lore check -> revise.
- **Local-first storage**: app data is stored locally in IndexedDB through Dexie.

## App Layout

The root route opens the editor workspace directly.

- **Left rail**: story selector, story actions, import/export, chapter list, chapter ordering, chapter summary, and chapter actions.
- **Main editor**: the writing surface, editor toolbar, chapter title, save status, and inline scene beats.
- **Right tool rail**: matched lore tags, outline, POV, timeline extraction, notes, drafts, brainstorm, lorebook, agents, prompts, prompt defaults, AI settings, and guide.
- **Slide-out sheets**: most supporting tools open from the right so the chapter remains the center of the app.

On mobile, the story/chapter rail becomes a left sheet and editor tools move into a floating menu.

## AI Providers

The app supports multiple AI backends:

- OpenAI
- OpenRouter
- Local OpenAI-compatible server, defaulting to `http://localhost:1234/v1`
- Custom OpenAI-compatible endpoint
- NanoGPT
- Google Gemini through `@google/genai`

API keys and model settings are stored locally. Prompt defaults currently include scene beat, brainstorm, and agent defaults. The agent default is configured for `google/gemma-4-31b-it` on OpenRouter, with local model fallback behavior when OpenRouter is not configured.

## Getting Started

Install dependencies:

```sh
npm install
```

Run the web development server:

```sh
npm run dev
```

Build the frontend:

```sh
npm run build
```

Preview the production frontend build:

```sh
npm run preview
```

Run Tauri commands:

```sh
npm run tauri
```

Create a debug desktop build:

```sh
npm run tauri build -- --debug
```

Create a release desktop build:

```sh
npm run tauri build
```

## Technology Stack

- **Desktop**: Tauri v2
- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, Radix/Shadcn-style components
- **Editor**: Lexical
- **State**: Zustand
- **Storage**: IndexedDB with Dexie
- **Drag and drop**: `@dnd-kit`
- **Icons**: Lucide React
- **Notifications**: React Toastify

## Project Structure

- `src/features/editor/` - editor-first workspace and story/chapter rail
- `src/features/chapters/` - chapter editor shell, outline, POV, summaries, notes, timeline extraction
- `src/Lexical/` - embedded Lexical editor and custom scene beat integration
- `src/features/lorebook/` - lorebook store and editor sheet
- `src/features/brainstorm/` - brainstorm chats, context controls, templates, and chat management
- `src/features/prompts/` - prompt manager, parser, import/export, and defaults
- `src/features/agents/` - agent and pipeline management
- `src/features/ai/` - AI settings and provider state
- `src/services/` - database, export/import, AI service, and orchestration helpers
- `src/types/` - shared TypeScript types
- `docs/` - implementation notes and deeper agent documentation
- `src-tauri/` - Tauri desktop shell

## Prompt Import And Export

Prompts can be exported and imported from the Prompts sheet. System prompts are excluded from exports.

The prompt export format is:

```json
{
  "version": "1.0",
  "type": "prompts",
  "prompts": []
}
```

Imported prompts are validated, assigned fresh IDs, and created as editable non-system prompts. If a prompt name already exists, the importer adds an `Imported` suffix.

## Documentation

- [Agents](docs/AGENTS.md) explains agent presets, pipeline presets, roles, context controls, and runtime flow.
- [Agent Orchestrator](docs/AgentOrchestrator.md) documents the multi-agent execution engine.
- [UI Overhaul Checkpoint](docs/UI_OVERHAUL_CHECKPOINT.md) captures historical overhaul context and useful source maps.

The built-in app guide is available from the editor's right tool rail.
