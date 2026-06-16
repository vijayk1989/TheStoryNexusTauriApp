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

`tests/editor.spec.ts` covers:

- seeded Iron Salt content loads as many paragraph nodes, not one giant paragraph
- Enter in seeded prose keeps a valid collapsed range selection
- SceneBeat insertion creates a trailing paragraph
- Backspace from the empty paragraph after a SceneBeat removes the SceneBeat
- editor changes autosave back to IndexedDB

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
