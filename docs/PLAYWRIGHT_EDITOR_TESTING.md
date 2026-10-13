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
