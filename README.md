# The Story Nexus

Version: `1.0.2`

The Story Nexus is a local-first desktop writing app for long-form fiction. It combines a chapter-focused editor with story context, lorebook matching, reusable AI prompts, brainstorm chats, and multi-agent generation pipelines.

The current app is intentionally editor-first: open the app, choose or create a story, choose a chapter, and write. Supporting tools live in the left story/chapter rail and the right editor tool rail instead of separate dashboard pages.

## Install On Windows

A Windows installer is available from the project Releases section.

1. Open the latest release.
2. Download the `.msi` installer.
3. Run the installer and follow the Windows setup prompts.
4. Launch **The Story Nexus** from the Start menu or desktop shortcut.

Windows may show a SmartScreen warning for new or unsigned builds. If you trust the release source, choose **More info** and then **Run anyway**.

## Highlights

- **Editor-first workspace**: manage stories and chapters from the left rail while keeping the chapter editor as the main surface.
- **Autosaving Lexical editor**: chapter content is saved frequently, with a visible saved/saving state in the editor top bar.
- **Story and chapter management**: create, rename, reorder, summarize, import, export, and delete stories or chapters.
- **Scene beats**: insert inline AI command blocks in the editor with `Alt+S` or `Option+S`, then generate, revise, compare models, or run an agent pipeline.
- **Lorebook**: store characters, locations, items, events, notes, synopsis, starting scenario, and timeline entries. Matching tags are surfaced while you write.
- **Brainstorm**: keep story-scoped brainstorm chats, add context, rename or delete chats from the chat selector, and optionally use agentic generation.
- **Prompts and defaults**: manage reusable prompts, import/export prompt packs, and set default models for scene beats, brainstorm, and agents.
- **Agents and pipelines**: build reusable AI workers and multi-step workflows such as summarize -> draft -> lore check -> revise.
- **Themes**: choose a built-in color preset or tune a custom local palette.
- **Site Backup**: export and import written content, prompts, agents, and pipelines without copying API keys or images.
- **Local-first storage**: app data is stored locally in IndexedDB through Dexie.

## App Layout

The root route opens the editor workspace directly.

- **Left rail**: story selector, story actions, import/export, chapter list, chapter ordering, chapter summary, and chapter actions.
- **Main editor**: the writing surface, editor toolbar, chapter title, save status, and inline scene beats.
- **Right tool rail**: matched lore tags, outline, POV, timeline extraction, notes, drafts, brainstorm, lorebook, agents, prompts, prompt defaults, AI settings, theme settings, Backup & Delete, and guide.
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

Run service and utility unit tests:

```sh
npm run test:unit
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

## Linux And Mac Installers

Linux and macOS installers are not published yet, but they can be produced from this Tauri project later.

Tauri desktop bundles are best built on the target operating system, or through a CI matrix that runs separate Windows, Linux, and macOS jobs. After installing the normal project dependencies and the Tauri prerequisites for that platform, run:

```sh
npm install
npm run tauri build
```

Typical outputs:

- **Linux**: `.deb`, `.rpm`, and/or AppImage bundles depending on the Tauri bundle configuration and installed Linux packaging tools.
- **macOS**: `.app` and `.dmg` bundles. Public distribution usually also needs Apple Developer signing and notarization.

The bundle settings live in `src-tauri/tauri.conf.json`. Update the `bundle.targets`, icons, signing, and platform-specific metadata there before publishing Linux or macOS releases.

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
- `tests/unit/` - Vitest tests for services and utilities
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

## Site Backup

Site Backup lives in the editor's Backup & Delete sheet. It exports stories, chapters, lorebook entries, scene beats, drafts, brainstorm chats, notes, user prompts, user agents, user pipelines, and pipeline execution history.

Site Backup intentionally does not include API keys, AI provider settings, generated images, or uploaded images. Importing a backup creates new content with fresh IDs and does not overwrite existing data. Images can be downloaded separately from the Image Gallery.

## Documentation

- [Repository Working Rules](AGENTS.md) records testing expectations, local LLM safety rules, and general coding workflow rules.
- [Agents](docs/AGENTS.md) explains agent presets, pipeline presets, roles, context controls, and runtime flow.
- [Agent Orchestrator](docs/AgentOrchestrator.md) documents the multi-agent execution engine.
- [UI Overhaul Checkpoint](docs/UI_OVERHAUL_CHECKPOINT.md) captures historical overhaul context and useful source maps.

The built-in app guide is available from the editor's right tool rail.
