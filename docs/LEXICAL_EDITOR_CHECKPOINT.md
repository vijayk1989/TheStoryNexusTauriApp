# Lexical Editor Checkpoint

Date: 2026-05-18

This checkpoint records the current state after the clean editor migration and the removal of the old Lexical playground runtime.

## Current State

- The chapter editor now runs through `src/components/editor/mainLexicalEditor`.
- `src/Lexical/lexical-playground` has been removed.
- Stale playground aliases were removed from `tsconfig.json` and `vite.config.ts`.
- `src/Lexical/shared` still exists as a separate legacy helper folder, but there are no active runtime imports from the deleted playground.
- `npm.cmd run build` passes after the playground deletion.

## Important Editor Paths

| Area                    | Current path                                                                  |
| ----------------------- | ----------------------------------------------------------------------------- |
| Editor shell            | `src/components/editor/mainLexicalEditor/MainLexicalEditor.tsx`               |
| Editor config and nodes | `src/components/editor/mainLexicalEditor/editorConfig.ts`                     |
| Load/save plugin        | `src/components/editor/mainLexicalEditor/plugins/ChapterContentPlugin.tsx`    |
| Toolbar                 | `src/components/editor/mainLexicalEditor/toolbar/StoryToolbarPlugin.tsx`      |
| Slash commands          | `src/components/editor/mainLexicalEditor/plugins/SlashCommandPlugin.tsx`      |
| SceneBeat node          | `src/components/editor/mainLexicalEditor/nodes/SceneBeatNode.tsx`             |
| SceneBeat block UI      | `src/components/editor/mainLexicalEditor/nodes/scene-beat/`                   |
| Lorebook highlights     | `src/components/editor/mainLexicalEditor/plugins/LorebookHighlightPlugin.tsx` |
| Serialization helpers   | `src/components/editor/mainLexicalEditor/serialization/`                      |

## Recent Fixes

- SceneBeat matched tags now show inline in the SceneBeat node without opening a duplicate dialog.
- Matched tags were removed from the right rail because SceneBeat owns that display now.
- The top toolbar is sticky.
- The inert Save button was removed from the toolbar; autosave status remains.
- Chapter POV editing was renamed to Edit POV and moved to a sheet.
- Prompt model picker scrollbars were cleaned up, and mouse wheel scrolling was fixed in the prompt model list.
- Prompt selector and multi-model chips received contrast/readability fixes.
- Seeded Iron Salt content now splits Markdown paragraphs correctly with Windows line endings.
- Existing demo seed chapters are repaired on startup when their stored text still matches the seed and has the old malformed paragraph shape.
- Backspace from an empty paragraph immediately after a SceneBeat removes the SceneBeat and preserves a visible editor selection.

## Manual Browser Verification Done

The app was tested against the existing dev server at `http://127.0.0.1:1420/`.

Verified manually/in browser:

- Iron Salt no longer loads Chapter One as one enormous paragraph.
- Enter behavior in the repaired seeded story no longer exhibits the original giant-paragraph cursor issue.
- The SceneBeat empty-paragraph Backspace bug was reproduced before the fix, then manually confirmed resolved afterward.

Build verification:

```powershell
npm.cmd run build
```

passes.

## Known Testing Gap

Browser automation for Lexical caret placement is brittle. DOM snapshots can confirm structure and selection state, but exact caret placement through automation is unreliable for rich text cases. The next step should be a focused editor test harness rather than relying only on manual browser checks.

Recommended first tests:

- Load seeded Iron Salt and assert it produces many paragraph nodes, not one giant paragraph.
- Insert SceneBeat below normal text and assert a trailing paragraph exists.
- Backspace in an empty paragraph after SceneBeat should remove the SceneBeat and leave a valid selection.
- Backspace before/after SceneBeat with real text should preserve expected text behavior.
- Press Enter in seeded story paragraphs and assert selection remains valid.

## Next Work

- Add automated editor regression tests around Lexical state transforms and keyboard commands.
- Keep browser testing for final user-flow verification, but use tests for repeatable selection and document-shape cases.
- Review unused dependencies now that the playground is gone. Good candidates to inspect: `@lexical/table`, `@lexical/markdown`, `@lexical/code`, `@lexical/yjs`, `yjs`, `katex`, `prismjs`, `prettier`, and `@excalidraw/excalidraw`.
