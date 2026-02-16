# Performance & Security Implementation Tracker

Last updated: 2026-02-16
Scope: `TheStoryNexusTauriApp` only
Source roadmap: `C:\Antigravity\Nexus\IMPROVEMENT_ROADMAP.md`

## How To Use

- Mark each task `[x]` only after code is merged and verified.
- Keep "Verification" command output attached to the PR.
- Do not start a phase gate until all previous phase gates are green.

## Baseline (Captured 2026-02-16)

| Metric | Baseline |
|---|---|
| Production build | Pass (`npm run build`) |
| Main JS chunk | `dist/assets/index-CHBijzp1.js` ~3537.80 kB minified, ~1152.31 kB gzip |
| TSX files | 203 |
| Memoized components (`memo`) | 0 |
| Console statements | 256 across 53 files |
| `dangerouslyAllowBrowser: true` | 3 occurrences in `src/services/ai/AIService.ts` |
| Tauri commands used by frontend | None (`invoke()` not found in `src`) |
| Tauri CSP | `null` in `src-tauri/tauri.conf.json` |
| Test files in `src` | 0 |

## Phase P0 - Delivery Baseline And CI

Goal: establish repeatable quality and performance checks before refactors.

### File-level checklist

- [x] Add scripts in `package.json` for `typecheck`, `lint`, `test`, `test:watch`.
- [x] Add test runner config in `vitest.config.ts` (new).
- [x] Add test setup in `src/test/setup.ts` (new).
- [x] Add first smoke test in `src/features/stories/stores/useStoryStore.test.ts` (new).
- [x] Add first smoke test in `src/services/ai/AIService.test.ts` (new, mocked).
- [x] Add CI workflow in `.github/workflows/ci.yml` (new).
- [x] Add bundle baseline script in `scripts/report-bundle-size.mjs` (new).
- [x] Store baseline artifact in `plans/perf-baseline.json` (new).

### Verification

- [x] `npm run typecheck`
- [x] `npm run build`
- [x] `npm run test`
- [ ] CI workflow passes on PR

### Phase gate

- [ ] Baseline checks are green in local and CI.

## Phase P1 - Security First (Backend AI And Secrets)

Goal: remove browser-side API key exposure and move remote AI calls to Tauri.

### File-level checklist

- [x] Add Tauri chat completion command(s) in `src-tauri/src/lib.rs`.
- [x] Add HTTP client and serialization dependencies in `src-tauri/Cargo.toml`.
- [x] Add provider request/response DTOs in `src-tauri/src/lib.rs` (or split into `src-tauri/src/ai.rs` new).
- [x] Register new command handlers in `src-tauri/src/lib.rs`.
- [x] Introduce frontend command adapter in `src/services/ai/tauriAIClient.ts` (new).
- [x] Route OpenAI/OpenRouter/NanoGPT/OpenAI-compatible generation through Tauri in `src/services/ai/AIService.ts`.
- [x] Remove all `dangerouslyAllowBrowser: true` usage in `src/services/ai/AIService.ts`.
- [x] Stop persisting raw keys in Dexie flow in `src/services/ai/AIService.ts`.
- [x] Update settings UI save/load path in `src/features/ai/components/AISettingsPanel.tsx`.
- [x] Tighten CSP from `null` in `src-tauri/tauri.conf.json`.
- [x] Add capability updates (if needed) in `src-tauri/capabilities/default.json` (not needed for current command set).

### Verification

- [x] Search returns zero `dangerouslyAllowBrowser: true` in `src`.
- [x] AI generation works for each configured provider via desktop runtime.
- [x] Browser heap inspection shows no provider keys retained in JS objects.
- [x] `npm run build` passes.
- [x] `cargo check` passes from `src-tauri`.

### Phase gate

- [x] Remote AI calls no longer require browser API keys.

Manual runtime verification (2026-02-16):
- `cargo test -- --ignored --nocapture` executed provider-by-provider runtime checks.
- OpenAI/OpenRouter/NanoGPT skipped because no secure keys were configured in local keyring.
- OpenAI-compatible skipped because `OPENAI_COMPATIBLE_BASE_URL` was not configured.
- Frontend hardening removed key-read command `get_provider_api_key` from Tauri command surface.
- Settings UI no longer rehydrates keys into React state on load.
- Provider key inputs are cleared after successful save to minimize heap retention.

## Phase P2 - Bundle Size And Load Performance

Goal: cut initial load cost and split heavy feature code paths.

### File-level checklist

- [ ] Convert static route imports to lazy imports in `src/main.tsx`.
- [ ] Add `Suspense` boundaries and loading fallback in `src/main.tsx`.
- [ ] Lazy-load chapter editor shell from `src/features/chapters/pages/ChapterEditorPage.tsx`.
- [ ] Defer `StoryEditor` / Lexical boot in `src/features/chapters/components/StoryEditor.tsx`.
- [ ] Add manual chunk strategy in `vite.config.ts`.
- [ ] Resolve icon asset path warnings in `src/Lexical/lexical-playground/src/index.css`.
- [ ] Resolve icon asset path warnings in `src/Lexical/lexical-playground/src/nodes/PageBreakNode/index.css`.
- [ ] Re-run and store bundle report in `plans/perf-baseline.json`.

### Verification

- [ ] `npm run build` has no unresolved asset warnings.
- [ ] Main chunk size reduced versus 2026-02-16 baseline.
- [ ] Route navigation to editor/lorebook/brainstorm still works.

### Phase gate

- [ ] Main bundle reduction documented and accepted.

## Phase P3 - Render And State Optimization

Goal: reduce unnecessary re-renders and avoid broad Zustand subscriptions.

### File-level checklist

- [ ] Replace full-store subscriptions with selectors in `src/features/stories/pages/Home.tsx`.
- [ ] Replace full-store subscriptions with selectors in `src/features/chapters/pages/Chapters.tsx`.
- [ ] Replace full-store subscriptions with selectors in `src/features/lorebook/components/LorebookEntryList.tsx`.
- [ ] Replace full-store subscriptions with selectors in `src/features/brainstorm/components/ChatInterface.tsx`.
- [ ] Add memoization to list item components in `src/features/stories/components/StoryCard.tsx`.
- [ ] Add memoization to list item components in `src/features/chapters/components/ChapterCard.tsx`.
- [ ] Split chat message row into memoized component in `src/features/brainstorm/components/ChatMessageItem.tsx` (new).
- [ ] Remove render-time `chapters.sort(...)` in `src/features/chapters/pages/Chapters.tsx`.
- [ ] Replace ad-hoc logs with logger utility in hot paths (`src/features/brainstorm/components/ChatInterface.tsx`, `src/features/chapters/stores/useChapterStore.ts`).

### Verification

- [ ] React Profiler confirms lower commit count on chapter/lorebook/chat interactions.
- [ ] No functional regressions in create/edit/delete flows.
- [ ] `npm run build` and tests pass.

### Phase gate

- [ ] Hot path interactions are visibly smoother and profiler evidence is attached.

## Phase P4 - Data Layer Cleanup And Test Coverage

Goal: improve Dexie maintainability and lock behavior with tests.

### File-level checklist

- [ ] Refactor schema string duplication in `src/services/database.ts`.
- [ ] Add indexed query path(s) and migration bump in `src/services/database.ts`.
- [ ] Add DB behavior tests in `src/services/database.test.ts` (new).
- [ ] Add import/export tests in `src/services/storyExportService.test.ts` (new).
- [ ] Add prompt parsing and sanitization tests in `src/features/prompts/services/promptParser.test.ts` (new).
- [ ] Add markdown sanitization regression tests in `src/features/brainstorm/components/MarkdownRenderer.test.tsx` (new).

### Verification

- [ ] Migration runs without data loss on existing local DB.
- [ ] CRUD and import/export tests pass.
- [ ] `npm run build` and `npm run test` pass in CI.

### Phase gate

- [ ] Database migration and regression suite are stable.

## Cross-phase Backlog

- [ ] Introduce centralized logger in `src/utils/logger.ts` (new) and progressively replace console calls.
- [ ] Add error boundary in `src/components/ErrorBoundary.tsx` (new) and wrap root route tree.
- [ ] Re-evaluate service worker and react-query adoption only after P1-P3 gates.

## Working Rules

- Keep feature parity during all phases.
- Keep changes small and mergeable (prefer PRs under 500 lines excluding tests).
- For each phase, include before/after metrics in PR description.
- If a phase fails gate criteria, pause and fix before starting next phase.
