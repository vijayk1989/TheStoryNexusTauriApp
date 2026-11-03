# Playwright Editor Testing

Phase 1 adds browser-level regression coverage for the Vite app, focused on the clean Lexical editor.

## Commands

```powershell
npm.cmd run test:e2e
npm.cmd run test:e2e:editor
npm.cmd run test:e2e:llm
npm.cmd run test:e2e:ui
```

The Playwright config starts Vite with `VITE_E2E=true` on port `1435` by default so the test-only editor bridge is mounted without colliding with the usual Tauri/Vite dev server. To override the test port:

```powershell
$env:E2E_PORT='1435'; npm.cmd run test:e2e:editor
```

## Editor Bridge

Dependency updates that affect CSS should run the editor lane and include a visual check of the editor and its dialogs. Tailwind 4 uses the native Vite plugin and loads the existing theme explicitly from `src/index.css`; see [dependency security maintenance](DEPENDENCY_SECURITY.md) for the migration and verification notes. Store temporary visual comparisons under `playwright/.cache/`, since Playwright clears `test-results/` when a run starts.

`src/components/editor/mainLexicalEditor/testing/EditorE2EBridge.tsx` exposes `window.__STORY_NEXUS_E2E__` only when Vite starts with `VITE_E2E=true`.

The bridge lets tests assert serialized Lexical state directly:

- current story/chapter ids
- paragraph count
- SceneBeat count
- top-level node types
- plain text
- current selection shape
- persisted chapter content from IndexedDB

This keeps the fragile caret cases testable without relying only on DOM snapshots.

## Current Coverage

### Brainstorm image attachments

Normal Brainstorm supports **Attach image** and clipboard image paste, including image-only messages. PNG, JPEG, and WebP are accepted, up to four images per message. **Resize large images** is enabled by default and limits newly attached images to 1600 pixels on the longest side. Files over 20 MB are rejected before decoding; stored/sent images are limited to 4 MB each. Disabling resizing retains the original image when it fits that limit. Requests containing more than 12 images or over 16 MB of encoded image data fail explicitly; earlier images are never silently dropped.

Thumbnails can be opened at full size or removed from the draft. Draft image references are saved in `AIChat.draftImageAssetIds`; sent images use `ChatMessage.imageAssetIds`. Bytes live in the existing `mediaAssets`/`mediaBlobs` repository, not in prompt templates or chat text. Removing an attachment detaches it from the draft; its asset remains available in the Images gallery. Gallery deletion archives images still referenced by chats or drafts so saved conversations retain their bytes. Agent pipelines currently accept text; image conversations must use normal Brainstorm mode.

Send immediately moves text and images into the right-side user message and clears the composer. A waiting indicator remains in the conversation until visible response text arrives. If generation fails before producing reply text, the user message is rolled back and its text/images return to the draft for retry; any text typed while waiting is retained. Partial replies remain saved if streaming fails after text arrives. The image browser test holds the local response open to check pending image/text sends and loading, then verifies both capability and HTTP error recovery without duplicate messages.

Prompt templates remain text-only. `buildBrainstormMessages` resolves the task and universal system prompts, expands the existing `{{chat_history}}` location into structured historical messages when images are present, and adds images to the current template's last user message. Templates without a history variable receive structured image history before that user message. Earlier images remain associated with their original user messages, including on follow-up and regeneration. Text-only chats retain the existing parser behavior. Preview shows the actual image parts and counts text tokens only; image token usage is additional.

Provider requests use OpenAI-compatible `image_url` content parts with local image data URLs; the Gemini adapter converts these to `inlineData`. LM Studio's native `/api/v1/models` capability metadata is checked for image requests using the concrete selected local model. Known text-only models are rejected before generation; routes without capability metadata can attempt the request and surface the server's error. There is no automatic model switch for image support. Request formats follow [OpenAI image inputs](https://developers.openai.com/api/docs/guides/images-vision?api-mode=chat) and [Gemini image inputs](https://ai.google.dev/gemini-api/docs/generate-content/image-understanding).

Site Backup version 1.1 includes image bytes referenced by Brainstorm messages and drafts, deduplicates assets, and remaps asset IDs on import. Other gallery images remain excluded and are counted in `skippedImages`. Older text-only backups remain importable. Legacy story-only exports still contain image metadata rather than bytes; use Site Backup to transfer conversations with images.

`tests/unit/brainstormImages.test.ts` covers message assembly and history, missing/cross-story assets, limits, provider encoding, native capability rejection, image backup round trips, and gallery reference protection. `tests/brainstorm-images.spec.ts` uses the real browser clipboard, a generated PNG fixture, and a mocked local endpoint. It checks paste, resizing, invalid files, thumbnails, preview, image-only sends, unsupported-model recovery, historical image requests, regeneration, draft/history persistence, removal, and mobile layout. No paid API or real local inference is used by this test.

```powershell
npm.cmd run test:e2e:editor -- tests/universal-system-prompts.spec.ts tests/brainstorm-images.spec.ts
```

### Universal system prompts

Create a prompt with type **Universal System** in the Prompts panel. This type contains exactly one non-empty system message, with no user/assistant messages, model selection, or generation settings. It remains editable, clonable, and exportable like other custom prompts.

Normal SceneBeat generation has a **Universal system prompt** dropdown, initially **None**. None preserves the selected task prompt's messages. Selecting a universal prompt replaces only the first system message; if none exists, it inserts a system message at the start. Later system messages and all user/assistant messages remain intact. Replacement happens before variable resolution in `PromptParser`, so Preview Prompt and both standard and parallel generation use the same assembled messages. Model and sampling settings still come from the task prompt. Regeneration continues the original resolved conversation, including its system override. Agent pipelines use their own agent prompts.

Normal Brainstorm chats use the same dropdown, initially **None**. Preview, generation, and regeneration pass the selected override through `PromptParser`. Web-search follow-up requests retain the resolved task messages and override alongside tool results. The selection is saved as `AIChat.universalSystemPromptId` and included in pinned chapter sessions, so switching chats, reopening the sheet, and reloading preserve each chat's choice. New chats start with None. Site backups remap chat selections to imported prompt IDs.

SceneBeat and Brainstorm prompt toolbar controls share a 40px height, including the two-line prompt/model selector, universal selector, and action buttons. Brainstorm's Insert and Send/Stop controls match this height, and controls wrap on narrow screens.

The selection is stored as `metadata.universalSystemPromptId` on the SceneBeat and in its serialized chapter snapshot. Clearing it restores the task prompt's own system instructions. SceneBeat mounting initializes saved AI settings when needed, so configured task/model defaults are available after reload without first opening an AI panel. Missing or invalid selections block preview/generation with an error instead of silently falling back. Site backup import validates universal prompts and remaps their references in both SceneBeat rows and chapter snapshots. Legacy story-only exports do not include the global prompt library; transfer prompts separately or use a Site Backup.

SceneBeat hydration permits one database load/create at a time and preserves command edits made while that operation is pending. The editor regression suite holds a SceneBeat write transaction open, types into the block, then releases it and verifies the command survives saving and reload.

`tests/unit/universalSystemPrompt.test.ts` covers replacement, insertion, variable resolution, unchanged source prompts, invalid/missing overrides, partial updates, cloning, and prompt import. Brainstorm store tests cover selection persistence and new-chat defaults. Site backup tests cover validation and selection remapping. `tests/universal-system-prompts.spec.ts` creates universal prompts through the real form and checks SceneBeat and Brainstorm preview, None restoration, reload persistence, outgoing request contents/settings, regeneration, chat switching, pinned sessions, SceneBeat acceptance/deletion, toolbar heights, and Brainstorm's mobile layout. Its local API responses are mocked, with paid-provider requests blocked; it requires no loaded model. Run it together with the editor lane:

```powershell
npm.cmd run test:e2e:editor -- tests/universal-system-prompts.spec.ts
```

### Chapter clipboard export

The chapter **Download** menu includes **Copy to clipboard**. It copies the entire current manuscript, including edits waiting for autosave, as both rich HTML and plain text. Rich pastes retain headings, paragraph breaks, inline formatting, lists, quotes, and embedded local images. SceneBeat/image generation controls, generation metadata, and disabled prose are excluded, consistent with manuscript exports. Story menus retain their existing download options.

Unit coverage checks formatting, pending edits, disabled prose, local image embedding, empty chapters, and clipboard failures. The editor lane grants clipboard permissions and verifies copying from the menu and pasting into a separate rich text field with headings intact.

### Accepted prose attribution

SceneBeat acceptance creates a `generated-prose` Lexical ElementNode containing editable paragraphs. Each acceptance stores its own generation ID, source SceneBeat instruction, model/provider, prompt name, generation time, and the resolved messages sent to the model. Standard generation and regeneration capture attribution after provider routing; local attribution uses the concrete model selected by the local request resolver. Parallel responses use their producing model, and pipeline output uses the matching producing step. The snapshot stays independent of later prompt edits or selector changes.

Acceptance also inserts an ordinary empty paragraph between the SceneBeat and its prose, including parallel-response acceptance. This gives the writer a clickable line for adding their own text outside the attribution block. Editor E2E coverage clicks and types in that line with labels shown and hidden, then verifies it survives autosave and reload.

The toolbar's **Show generation labels** preference is saved locally across sessions. Turning it off hides labels and block borders while continuing to capture metadata. Clicking a label selects its block; Delete/Backspace removes it and Undo restores it. Details opens the saved attribution and prompt messages. Enter inside the block creates attributed paragraphs; Enter on its final empty paragraph exits to ordinary prose. Backspace/Delete at block boundaries does not merge attribution groups. Deleting the source SceneBeat leaves accepted prose intact.

Metadata lives in chapter JSON, so autosave and story backups retain it. Manuscript HTML/text and word counts traverse only prose children, excluding the label and prompt snapshot. Clipboard HTML similarly omits the label; Lexical clipboard data can retain attribution. Earlier plain paragraphs are not retroactively attributed.

Each block also offers **Remove label** beside Details. It unwraps that block into ordinary editor paragraphs/headings, removing its label, border, and prose attribution while retaining the children and their formatting. Other attributed blocks and the source SceneBeat remain intact. Undo/Redo restores/removes the wrapper as one history action; autosave retains the conversion on reload. E2E coverage checks child-state preservation, history, persistence, and removal of only the chosen block.

**Copy text** copies the current prose of that block as plain text with paragraph breaks, excluding labels, controls, and generation metadata. It also works on disabled blocks as an explicit user copy action; this does not enable the block or change its content. Clipboard success/failure uses the app's existing toast feedback.

**Disable block / Enable block** persists a disabled flag on the entire prose container. Disabled prose is muted and read-only until enabled. Manuscript HTML/text exports, chapter text for summaries and timeline extraction, prompt chapter content, SceneBeat and pipeline previous words, Simple Write before/after context, brainstorm chapter context, lore matching, and active word counts skip disabled subtrees. Selection-based AI actions reject disabled text. The controls of a disabled block stay visible when generation labels are globally hidden so the block can be enabled again; Remove label is unavailable until then. Existing saved summaries and historical generation snapshots are not rewritten. Regenerate earlier summaries if they contain prose that has since been disabled.

Chapter readers and manuscript exports consult the pending editor content during the autosave debounce, so disabling a block takes effect immediately. Once that exact content is saved, the pending copy is cleared; an older save cannot clear a newer edit. Chapter JSON and backups preserve disabled content for restoration. Unit tests cover persistence, summary prompt input, all four manuscript export paths, pending edits, and active word counts. E2E tests cover before/after context, read-only behavior, re-enabling, hidden-label recovery, reload, and Undo/Redo.

Unit tests check snapshot independence, serialized-state round trips, word counts, and manuscript/clipboard HTML. Editor E2E tests accept a deterministic pending SceneBeat fixture using the bridge (available only with `VITE_E2E=true`) and cover visibility persistence, details, editing, exiting the block, source deletion, whole-block deletion, and undo/redo. The local LLM lane verifies attribution on actual generated outputs and must still abort if LM Studio is unavailable.

`tests/editor.spec.ts` covers:

- seeded example story content loads as many paragraph nodes, not one giant paragraph
- Enter in seeded prose keeps a valid collapsed range selection
- SceneBeat insertion creates a trailing paragraph
- Backspace from the empty paragraph after a SceneBeat removes the SceneBeat
- editor changes autosave back to IndexedDB

## Simple Write Setup Recovery

Simple Write performs a configuration preflight before sending a generation request. If its model is missing, a hosted provider has no API key, the OpenAI-compatible provider is missing its URL, or local model discovery has only returned the placeholder model, the editor opens the AI setup dialog instead of showing a generic generation error.

The dialog preserves the pending Simple Write request, lets the user connect a provider and choose a model with the existing prompt/model menu, saves that model as the Simple Write default, and retries the captured request. Invalid credentials, provider outages after a valid setup, rate limits, and other generation failures continue through normal error reporting.

Pure configuration detection and model-resolution cases are covered in `tests/unit/generationSetup.test.ts`. Browser coverage for the recovery dialog can be added separately without placing provider credentials in the E2E fixtures.

## Next Phase

Phase 2 adds a separate local-LLM project for local OpenAI-compatible runtimes such as LM Studio, Ollama, and llama.cpp.

Before running it, start the local server and load a model. The default runtime is LM Studio, with this health check:

```text
http://localhost:1234/api/v1/models
```

Run:

```powershell
npm.cmd run test:e2e:llm
```

That npm script performs a quick Node preflight first. If LM Studio is not reachable or has no loaded model, it exits before starting Vite or Playwright.

Optional overrides:

```powershell
$env:LOCAL_LLM_HEALTH_URL='http://localhost:1234/api/v1/models'
$env:LOCAL_LLM_API_URL='http://localhost:1234/v1'
npm.cmd run test:e2e:llm
```

Ollama example:

```powershell
$env:LOCAL_LLM_RUNTIME='Ollama'
$env:LOCAL_LLM_HEALTH_URL='http://localhost:11434/api/tags'
$env:LOCAL_LLM_API_URL='http://localhost:11434/v1'
npm.cmd run test:e2e:llm
```

The `setup-local-llm` Playwright project repeats the configured local health check before any LLM spec runs. This protects direct Playwright invocations as well as the npm script.

The health parser supports these response shapes:

- native LM Studio: `{ "models": [...] }`, preferring LLM entries with `loaded_instances`
- OpenAI-compatible: `{ "data": [...] }`
- Ollama: `{ "models": [{ "name": "model-name" }] }`

By default, health checks use LM Studio's native models endpoint (`/api/v1/models`), while generation uses the OpenAI-compatible base URL (`/v1`) because the app calls `/chat/completions` under that base.

The local-LLM spec installs a browser network guard that aborts requests to paid-provider hosts:

- `api.openai.com`
- `openrouter.ai`
- `nano-gpt.com`
- `generativelanguage.googleapis.com`
- `aiplatform.googleapis.com`

The first LLM coverage generates a chapter summary through the real app UI and asserts that at least one `/chat/completions` request went to LM Studio while no paid-provider request was attempted.

The local-LLM lane also covers multi-SceneBeat writing:

- configure LM Studio as the local/default SceneBeat model
- insert two SceneBeat blocks through the editor shortcut
- fill each SceneBeat command in the real inline UI
- generate prose through LM Studio for each beat
- accept each generated output so it is inserted into the chapter
- assert the accepted prose appears in the serialized Lexical text
- assert no paid-provider request was attempted

This is intentionally in `test:e2e:llm`, not `test:e2e:editor`, because it can be slow and depends on a loaded local model.

## Interrupted stream recovery

SceneBeat and Brainstorm generation (including regeneration and pipeline output) checkpoint received text to IndexedDB about once a second. They flush the latest text when generation finishes, is stopped, or fails. SceneBeat partial output remains unaccepted and can be accepted, rejected, or saved as a draft; Brainstorm partial output remains in the chat. Reloading during generation restores the most recent checkpoint. An abrupt app exit can still lose tokens received since that checkpoint.

Run the deterministic browser regression tests with:

```powershell
npx.cmd playwright test tests/stream-recovery.spec.ts --project=chromium
```

These tests use browser stream fixtures with local model configuration and a paid-provider network guard. They do not need LM Studio or spend API credits. They cover disconnects, Stop, interrupted regeneration, checkpoint recovery after reload, and accepting/rejecting recovered SceneBeat output. Unit tests cover checkpoint timing, ordered writes, and storage failures. The real local-model lane remains a separate check using `npm.cmd run test:e2e:llm`.

## Brainstorm background tasks

Normal Brainstorm responses, regeneration, and agent pipelines are owned by `brainstormGeneration.ts` and `useBrainstormTaskStore`, independently of the mounted chat panel. Closing the sheet, opening another tool, or switching chats/stories does not cancel a task. Returning to the chat shows its current text or saved result. The chat selector shows running, completed, stopped, and failed states; the Brainstorm tool icon shows when any task is running.

Only one task runs per chat. Different chats can have independent active tasks. Each task uses an isolated `AIService` session and, for pipelines, an isolated `AgentOrchestrator`, so Stop affects only that task. Provider routing and prompt parameters share the `generateParsedMessages` helper with the existing AI store. Results and recovery drafts stay with the originating chat. Deleting a chat cancels its task; late writes cannot recreate the deleted chat. Message editing/deletion is unavailable while that chat's task owns its conversation history.

Live task state is in memory while the app is running; received text still checkpoints to IndexedDB. Reloading recovers saved partial text but does not resume the network request.

```powershell
npx.cmd playwright test tests/brainstorm-background.spec.ts tests/stream-recovery.spec.ts tests/brainstorm-images.spec.ts --project=chromium
```

The background-task browser fixtures hold response headers and streams open to test panel closure before the first response, editor autosave during generation, chat switching, independent cancellation, and background regeneration. Unit coverage also checks duplicate-task prevention, deletion during a stream, failed-request draft restoration, story switching, and pipeline execution. No real model or paid provider is used by these fixtures.

## Brainstorm panel sizing

The divider above Context uses the existing vertical resizable-panel primitive. Both the response and input panels retain at least 20% of the available height. Context and input controls share a scrollable lower panel, keeping controls reachable in compact layouts without expanding the sheet. The split is saved locally under the `brainstorm-input-layout` panel-group preference and reused across chats and sheet remounts. The separator supports pointer/touch dragging and keyboard resizing.

```powershell
npx.cmd playwright test tests/brainstorm-layout.spec.ts --project=chromium
```

The layout fixtures cover dragging in both directions, draft/response preservation, saved sizing after reopening, keyboard resizing and size limits, expanded Brainstorm, and a 390-by-640 window. Screenshots are written to the ignored Playwright output directory for visual review. No real model is used.

## Prompt drafts and unfinished input

SceneBeat and Brainstorm expose one Prompt drafts menu with Save and Load actions. Save makes an independent story-scoped snapshot of the typed input and selected prompt/model, with an automatic title. It does not generate or clear the input. Load fills an empty input, or offers Append/Replace for occupied input. Context configuration, attachments, and generated responses are not part of a named prompt snapshot. The Drafts sheet separates story-wide Prompt Drafts from chapter-specific Response Drafts; prompt snapshots can be renamed, copied, and deleted. Deleting their original chat or SceneBeat does not remove them.

Database version 20 adds `promptDrafts`. SceneBeat command recovery continues through its existing autosave and chapter snapshot. Unsent Brainstorm input is saved to `AIChat.draftInput` using ordered writes per chat, independently of message history and background task checkpoints. New input typed during generation is retained. Sending clears the submitted input, and failed submissions restore it to the originating chat. Save/Load and export operations wait for pending input writes. Site Backups and legacy story JSON exports include snapshots and unfinished input; old backups without prompt snapshots remain supported. Chapter/prompt references are remapped during Site Backup import. Deleting a story or all user content removes its prompt snapshots.

Prompt/model selection and input actions occupy distinct toolbar rows. Image resizing is now a persistent option under Prompt Defaults, outside Enable Defaults so it remains configurable independently. `brainstormResizeImages` defaults to true and controls new attachments; existing images are unchanged. Prompt Defaults initializes AI settings before allowing a save, including immediately after app startup.

```powershell
npx.cmd playwright test tests/prompt-drafts.spec.ts --project=chromium
npm.cmd run test:unit
```

Browser fixtures verify SceneBeat and Brainstorm Save/Load, Append/Replace, recovery after reload, independent library management after source deletion, mobile action reachability, and the persisted image-resizing preference. They assert that no generation request is made. Unit coverage includes ordered input persistence, database migration from version 19, source/story deletion, snapshot management, Site Backup reference remapping, and legacy story exports/imports. Layout screenshots are retained in ignored Playwright output directories.

The unit-test environment uses Happy DOM 21 as a development dependency. Vite 6.4.5 and Vitest 4.1.12 include security fixes; install dependencies from the committed lockfile. Release automation runs `npm.cmd audit --audit-level=high` before building and blocks publication on high or critical dependency advisories.

Native dependency changes also need `cargo check --manifest-path src-tauri/Cargo.toml --locked` and a signed MSI build. Review GitHub Dependabot alerts for `src-tauri/Cargo.lock` separately from npm audit. The updater keeps Rustls TLS and system-proxy support, with optional ZIP extraction disabled because releases and updater metadata use raw `.msi` files. Do not switch the update URL to a ZIP archive without revisiting that feature configuration.
