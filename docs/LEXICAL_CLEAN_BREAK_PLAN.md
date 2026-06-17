# Lexical Clean Break Plan

## Decision

We will make a clean break from the embedded Lexical playground instead of trying to untangle it in place.

Old saved chapter compatibility is not a goal. If old chapter JSON fails to load after the switch, that is acceptable. This lets us build a small Story Nexus editor around the features we actually care about, then retire the playground folder once the replacement is proven.

## Proposed Location

Create a new editor package:

```text
src/components/editor/mainLexicalEditor/
  MainLexicalEditor.tsx
  editorConfig.ts
  nodes/
  plugins/
  toolbar/
  floatingToolbar/
  serialization/
  styles.css
```

The old playground has been removed. The new editor package must remain self-contained and avoid reintroducing playground-era coupling.

## Must Work

The clean editor must support:

- Rich prose editing.
- Basic toolbar.
- Autosave/load.
- Word count.
- Undo/redo.
- Scene beat node.
- Image generation node.
- Asset image rendering/insertion from generated/uploaded images.
- Selection-specific custom floating toolbar, including rewrite/expand style flows and selected-text replacement.
- Lorebook highlighting/matching, for now, though this is expected to be reworked later.

Not required:

- Old saved chapter JSON compatibility.
- Link editing.
- Clickable links.
- Markdown shortcuts.
- Collaboration.
- Playground settings.
- Playground diagnostics/dev tooling.
- Tables.
- Embeds.
- Polls.
- Sticky notes.
- Equations.
- Layout/collapsible blocks.
- Inline images, unless we later choose to support them as a product feature.

## Why This Is Better

The current editor is a product editor hidden inside the Lexical playground. Cleaning it in place means every deletion has to answer, "what else in the playground depended on this?" A clean editor flips that:

1. Start with Lexical core.
2. Add only Story Nexus features.
3. Port custom code deliberately.
4. Delete the playground once the new editor is live.

Because old chapter compatibility is not required, we can avoid legacy node registries and migrations. That removes the biggest constraint from the earlier cleanup plan.

## Target Runtime Shape

### Node Registry

Start with only:

- `HeadingNode`
- `QuoteNode`
- `ListNode`
- `ListItemNode`
- `AutoLinkNode` only if needed by paste/import behavior, not for link UI
- `ImageNode` or a new simplified `AssetImageNode`
- `SceneBeatNode`
- `ImageGenerationNode`

Possibly include:

- `HorizontalRuleNode`, if we keep horizontal rules.
- `PageBreakNode`, if we keep page breaks.

Avoid:

- `TableNode`, `TableRowNode`, `TableCellNode`
- `CodeNode`, `CodeHighlightNode`
- `MarkNode`
- `PollNode`
- `StickyNode`
- `EquationNode`
- `TweetNode`, `YouTubeNode`, `FigmaNode`
- `InlineImageNode`
- `Collapsible*Node`
- `Layout*Node`
- `MentionNode`, `EmojiNode`, `AutocompleteNode`, `KeywordNode`
- `HelloWorldNode`

### Plugin Set

Build small app-owned plugins:

- `ChapterContentPlugin`
  - loads current chapter content
  - saves editor JSON
  - owns save status transitions
  - replaces `LoadChapterContent` and `SaveChapterContent`
- `StoryToolbarPlugin`
  - basic formatting only
  - undo/redo
  - block type
  - font family/size if still wanted
  - insert scene beat
  - insert image generation
  - possibly page break/horizontal rule
- `WordCountPlugin`
- `SceneBeatPlugin`
  - scene beat node rendering and lifecycle
  - keyboard shortcut if wanted
- `ImageGenerationPlugin`
  - image generation node rendering
  - generated asset insertion
- `AssetImagePlugin`
  - resolves `story-nexus-asset:<id>` to blob URLs
  - renders stored asset images
- `SelectionRewriteFloatingToolbar`
  - port from current `FloatingTextFormatToolbarPlugin`
  - selection-specific prompt type
  - selected text context
  - previous/next chapter context
  - custom rewrite/expand instruction
  - prompt preview
  - custom lorebook context selection
  - accept/reject replacement
- `LorebookHighlightPlugin`
  - keep minimal existing behavior initially
  - later rewrite as its own feature

Avoid mounting:

- collaboration
- context menu
- markdown shortcuts
- auto embed
- draggable block plugin
- floating link editor
- playground speech-to-text plugin
- component picker
- table plugins
- debug/tree/test plugins

## Serialization Policy

Since old chapter compatibility is not required, the new editor can own a new, strict content format.

Rules:

- New empty chapters should use a fresh minimal Lexical JSON shape.
- If an old chapter cannot parse, show a clear empty-editor recovery path rather than trying to preserve every old node.
- Plain text extraction should live in one app-owned utility.
- HTML export should live in one app-owned utility.
- Scene beats and image generation nodes should have explicit behavior in plain text and export conversion.

Suggested files:

```text
serialization/
  emptyEditorState.ts
  lexicalToPlainText.ts
  lexicalToHtml.ts
  extractSelectionContext.ts
```

## Porting Strategy

### Phase 1: Skeleton Editor

Create `MainLexicalEditor` with:

- `LexicalComposer`
- fixed editor config
- rich text plugin
- content editable
- history plugin
- basic theme
- error boundary
- chapter load/save
- word count

At the end of this phase:

- create a new chapter
- type prose
- autosave
- reload
- undo/redo
- word count

### Phase 2: Basic Toolbar

Add `StoryToolbarPlugin`:

- undo/redo
- paragraph/heading/quote/list
- bold/italic/underline/strike
- font family/size if we keep them
- alignment if we keep it
- insert scene beat button placeholder
- insert image generation button placeholder

The toolbar should use app UI components and lucide icons, not playground CSS icon classes.

### Phase 3: Port Scene Beat

Port the current scene beat implementation into the new editor package.

Likely files to move/adapt:

- `SceneBeatNode.tsx`
- `nodes/scene-beat/*`
- `useSceneBeatGeneration`
- scene beat instance store
- scene beat global store/service

Important behavior to preserve:

- new scene beat creates/persists an ID
- command saves
- generated prose saves
- accept inserts generated prose into the editor
- reject clears generated prose
- reload restores scene beat state
- prompt defaults still apply

### Phase 4: Port Image Generation And Asset Images

Port:

- `ImageGenerationNode`
- asset image insertion flow
- asset URL resolution via `resolveAssetDisplayUrl`
- block image rendering

Prefer a simplified `AssetImageNode` over the playground `ImageNode` if feasible.

Important behavior to preserve:

- generated assets are stored in IndexedDB
- inserted asset images render as blob URLs, never as raw `story-nexus-asset:` browser URLs
- reload restores rendered images
- gallery insertion still works

### Phase 5: Port Selection Floating Toolbar

Port the current custom selection toolbar from `FloatingTextFormatToolbarPlugin`.

This is not just formatting. It includes the important AI rewrite/expand workflow:

- selection-specific prompt loading
- selected text capture
- prompt parser config with `{{selection}}`
- custom rewrite/expand instruction
- optional lorebook context selection
- prompt preview
- streaming/generation handling
- accept/reject UI
- replacement of the original selected text

Recommended cleanup during port:

- Split into smaller files:
  - `SelectionFloatingToolbar.tsx`
  - `SelectionAiActions.tsx`
  - `CustomRewritePanel.tsx`
  - `SelectionPromptPreview.tsx`
  - `useSelectionAiRewrite.ts`
  - `selectionReplacement.ts`
- Keep behavior the same first; refactor internals only after browser verification.

### Phase 6: Lorebook Highlighting

Bring over the current lorebook tag highlighting/matching only after the editor core is stable.

Keep it intentionally thin because you already want to rework it later:

- detect current story/chapter context
- highlight matched aliases
- preserve current matched aliases side-panel behavior if needed

### Phase 7: Swap Editor Entry Point

Completed replacement:

```ts
import { MainLexicalEditor } from "@/components/editor/mainLexicalEditor/MainLexicalEditor";
```

The old playground folder has been removed. The clean editor is now the only runtime editor path.

### Phase 8: Delete Playground - Complete

Completed cleanup:

- deleted `src/Lexical/lexical-playground`
- removed stale `@lexical-playground` path aliases

Follow-up dependency cleanup candidates:
- remove unused dependencies:
  - `@lexical/table` if tables are gone
  - `@lexical/markdown` if markdown shortcuts are gone
  - `@lexical/code` if code blocks are gone
  - `@lexical/mark` if comments/marks are gone
  - `@lexical/yjs` and `yjs` if present
  - `@excalidraw/excalidraw`
  - `katex`
  - `prismjs`
  - `prettier` if only used by code block formatting
- remove unused playground image/icon assets

## Suggested First PR

Do not port scene beats first. First prove the clean editor can own chapter content.

First PR scope:

1. Create `src/components/editor/mainLexicalEditor`.
2. Add a basic `MainLexicalEditor`.
3. Add minimal load/save plugin wired to chapter store and editor save status.
4. Add basic toolbar with undo/redo and text formatting.
5. Add word count.
6. Add a feature flag or temporary switch so we can open the new editor without deleting the old one.

Acceptance:

- A new chapter opens in the new editor.
- Typing saves.
- Reload restores.
- Undo/redo works.
- Word count updates.
- No playground imports in the new editor package.

## Suggested Second PR

Port scene beat:

- register `SceneBeatNode`
- add insert button and/or shortcut
- port scene beat components/hooks/stores
- verify command save/reload
- verify prose generation accept/reject

## Suggested Third PR

Port image generation and asset images:

- register image generation node
- register asset image node
- connect image gallery insertion
- verify generated/uploaded images render after reload

## Suggested Fourth PR

Port the selection-specific floating toolbar:

- basic selection detection/positioning
- bold/italic/underline controls
- selection prompt menu
- custom rewrite/expand panel
- accept/reject replacement
- prompt preview
- optional lorebook context controls

## Verification Checklist

For each phase:

- `npm.cmd run build`
- browser open editor
- create new story/chapter
- type prose
- autosave/reload
- undo/redo
- word count
- console check

Feature-specific checks:

- insert scene beat
- save scene beat command
- reload scene beat command
- generate prose
- accept prose into editor
- insert image generation block
- generate or insert asset image
- reload asset image with no `story-nexus-asset:` URL error
- select text and open floating toolbar
- run rewrite/expand
- preview prompt
- accept replacement
- reject replacement

## Notes

This plan intentionally creates temporary duplication. That is preferable here. Trying to surgically mutate the playground into the final shape keeps us coupled to old assumptions. A clean editor lets us build toward the product we actually have now.
