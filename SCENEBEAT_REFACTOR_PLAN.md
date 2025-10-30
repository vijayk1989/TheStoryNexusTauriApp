# SceneBeatNode.tsx Refactoring Plan

**File:** `src/Lexical/lexical-playground/src/nodes/SceneBeatNode.tsx`
**Current Size:** 1,423 lines
**Status:** Works correctly, needs structural refactoring only

---

## Executive Summary

SceneBeatNode.tsx is a massive, unwieldy component with numerous code quality issues. The component works functionally but violates multiple architectural principles from CLAUDE.md and React best practices. This plan outlines a comprehensive refactoring to improve maintainability, testability, and code quality without changing any behavior.

---

## Critical Issues Identified

### 1. Component Size & Complexity
- **SceneBeatComponent**: 1,260 lines (lines 93-1352)
- Handles 10+ distinct responsibilities
- Impossible to test, maintain, or reason about

### 2. State Management Disaster
- **40+ state variables** scattered throughout
- **8 useEffect hooks**, most are React antipatterns:
  - Lines 262-281: useEffect for derived state (should be useMemo)
  - Lines 255-259, 284-307: useEffect for side effects (should be event handlers)
  - Lines 150-343: Complex initialization spread across 4 separate effects
- State explosion makes component fragile and hard to debug

### 3. Code Duplication (~200 Lines)
- **Lorebook selection UI duplicated**:
  - Lines 971-1038: Custom Context section
  - Lines 1256-1349: Additional Context Panel (dead code!)
- **Badge rendering duplicated**:
  - Lines 1156-1186: Chapter matched entries
  - Lines 1188-1218: Scene beat matched entries
  - Lines 1220-1250: Custom context entries
- **POV state duplicated**:
  - Lines 115-120: Main POV state
  - Lines 123-131: Temporary POV state (antipattern)

### 4. Separation of Concerns Violations
- **Business logic in component**:
  - Lines 484-592: `createPromptConfig` (108 lines of business logic)
  - Lines 489-530: Complex Lexical editor traversal
- **Database operations scattered** throughout component
- **UI state mixed with domain state** without clear boundaries
- Violates CLAUDE.md functional programming principles

### 5. React Antipatterns
- **useEffect for derived state** (lines 262-281, 337-343)
- **useEffect for side effects** instead of event handlers (lines 255-259, 284-307)
- **Temporary state for modal editing** (POV popover)
- **Missing memoization** for expensive computations (line 148: characterEntries)
- **Inline functions in JSX** creating new references every render

### 6. Performance Issues
- 40+ state variables cause excessive re-renders
- Missing memoization for filtered/computed values
- Debounce in useMemo with empty deps array (lines 240-252)

### 7. Code Quality Issues
- Console.logs in production code (12+ instances)
- Magic numbers (debounce delays: 500ms)
- Inconsistent error handling (toast vs console.error)
- Dead code: `showAdditionalContext` panel (93 lines, never used)
- Type safety: `as any` assertion (line 815)
- Missing ARIA labels on icon buttons

---

## Refactoring Strategy

### Phase 1: Extract Reusable UI Components

Create focused, reusable components from duplicated/complex UI sections:

#### 1.1 `LorebookMultiSelect.tsx`
**Purpose:** Reusable multi-select dropdown for lorebook entries
**Eliminates duplication:** Lines 971-1038, 1256-1349
**Responsibilities:** Category-grouped entry selection, badge display, add/remove handling

#### 1.2 `EntryBadgeList.tsx`
**Purpose:** Display badges for lorebook entries with optional remove
**Eliminates duplication:** Lines 1156-1250
**Responsibilities:** Render entry badges, handle removal, show empty states

#### 1.3 `POVSettingsPopover.tsx`
**Purpose:** POV type and character selection
**Extracts:** Lines 791-866
**Responsibilities:** POV editing UI, character filtering, save/cancel logic

#### 1.4 `ContextToggles.tsx`
**Purpose:** Three toggle switches for context selection
**Extracts:** Lines 924-968
**Responsibilities:** Toggle UI, change propagation, collapsible section

#### 1.5 `MatchedEntriesPanel.tsx`
**Purpose:** Display panel showing all matched entries sections
**Extracts:** Lines 1146-1253
**Responsibilities:** Section layout, conditional rendering based on toggles

#### 1.6 `GenerationControls.tsx`
**Purpose:** Prompt selection, preview, and generate buttons
**Extracts:** Lines 1081-1127
**Responsibilities:** Prompt/model selection, action buttons, loading states

---

### Phase 2: Extract Custom Hooks (Fix useEffect Antipatterns)

Create focused hooks to eliminate useEffect abuse and consolidate related logic:

#### 2.1 `useSceneBeatData.ts`
**Purpose:** Consolidate all data loading and initialization
**Replaces:** Lines 150-343 (4 separate useEffect hooks)
**Key fix:** Single initialization point, proper async handling, loading states

#### 2.2 `useSceneBeatGeneration.ts`
**Purpose:** AI generation, streaming, and content management
**Extracts:** Lines 642-744 (generation, accept/reject logic)
**Responsibilities:** Stream management, abort handling, content acceptance

#### 2.3 `useCommandHistory.ts`
**Purpose:** Undo/redo functionality with keyboard shortcuts
**Extracts:** Lines 336-407
**Responsibilities:** History stack, keyboard shortcuts, undo/redo logic

#### 2.4 `useLorebookMatching.ts`
**Purpose:** Tag matching logic (fix useEffect antipattern)
**Replaces:** Lines 262-281 (useEffect for derived state → useMemo)
**Key fix:** Derived state computed via useMemo, no side effects

#### 2.5 `useSceneBeatSync.ts`
**Purpose:** Debounced database synchronization
**Replaces:** Lines 239-259, 284-307 (useEffect for side effects)
**Key fix:** Explicit save functions called from event handlers, not effects

---

### Phase 3: Extract Business Logic Services

Move business logic out of component into service layer:

#### 3.1 `sceneBeatPromptService.ts`
**Purpose:** Prompt configuration creation
**Extracts:** Lines 484-592 (`createPromptConfig` function)
**Responsibilities:** Combine matched entries, extract context, build config object

#### 3.2 `lexicalEditorUtils.ts`
**Purpose:** Lexical editor operations
**Extracts:** Lines 489-530 (traversal), 717-724 (manipulation)
**Responsibilities:** Previous text extraction, node insertion, editor updates

---

### Phase 4: Consolidate State Management

Transform 40+ useState calls into organized state objects:

#### 4.1 UI State Consolidation
Group: `collapsed`, `showMatchedEntries`, `showPreviewDialog`, `showContext`, `showPovPopover`

#### 4.2 Generation State Consolidation
Group: `streaming`, `streamedText`, `streamComplete`, `selectedPrompt`, `selectedModel`

#### 4.3 Context State Consolidation
Group: `useMatchedChapter`, `useMatchedSceneBeat`, `useCustomContext`, `selectedItems`

#### 4.4 Preview State Consolidation
Group: `messages`, `loading`, `error`

#### 4.5 Eliminate Temporary POV State
Remove `tempPovType` and `tempPovCharacter` (lines 123-131). Handle POV editing with controlled form state inside `POVSettingsPopover` component.

---

### Phase 5: Restructure SceneBeatComponent

Final component structure (~150 lines):

**Key architectural changes:**
- 40+ state variables → 5 hooks + 1 consolidated UI state object
- Business logic extracted to services
- useEffect hooks reduced from 8 → 2-3 (only legitimate side effects)
- Event handlers replace useEffect for database sync
- useMemo replaces useEffect for derived state
- All UI sections delegated to extracted components

**Component responsibilities:**
- Coordinate data flow between hooks
- Handle user interactions (commands to hooks/services)
- Render layout using extracted components
- Manage UI-only state (collapse, dialogs)

---

## Additional Fixes

### Type Safety
- Replace `as any` assertion (line 815) with proper typing
- Ensure all event handlers have explicit types

### Performance
- Memoize `characterEntries` filter (line 148)
- Add memoization to other computed values

### Code Quality
- Extract magic numbers (debounce delay: 500ms)
- Add ARIA labels to icon-only buttons (lines 762, 878)
- Consolidate error handling (toast for user errors, proper logging for dev)
- Remove production console.logs

### Dead Code Removal
- Delete `showAdditionalContext` panel (lines 1256-1349, 93 unreachable lines)

---

## File Structure After Refactoring

```
src/Lexical/lexical-playground/src/nodes/
├── SceneBeatNode.tsx (~200 lines)
│   ├── SceneBeatComponent (~150 lines)
│   └── SceneBeatNode class (~50 lines)
│
└── scene-beat/
    ├── components/
    │   ├── LorebookMultiSelect.tsx (~80 lines)
    │   ├── EntryBadgeList.tsx (~50 lines)
    │   ├── POVSettingsPopover.tsx (~100 lines)
    │   ├── ContextToggles.tsx (~60 lines)
    │   ├── MatchedEntriesPanel.tsx (~80 lines)
    │   └── GenerationControls.tsx (~100 lines)
    │
    ├── hooks/
    │   ├── useSceneBeatData.ts (~120 lines)
    │   ├── useSceneBeatGeneration.ts (~150 lines)
    │   ├── useCommandHistory.ts (~80 lines)
    │   ├── useLorebookMatching.ts (~30 lines)
    │   └── useSceneBeatSync.ts (~80 lines)
    │
    ├── services/
    │   ├── sceneBeatPromptService.ts (~100 lines)
    │   └── lexicalEditorUtils.ts (~80 lines)
    │
    └── types/
        └── sceneBeat.types.ts (~50 lines)
```

---

## Refactoring Order

### Step 1: Extract Business Logic Services (Low Risk)
1. Create `lexicalEditorUtils.ts`
2. Create `sceneBeatPromptService.ts`
3. Update SceneBeatComponent to use extracted services
4. Test functionality

### Step 2: Extract Reusable UI Components (Medium Risk)
1. Create `EntryBadgeList.tsx`
2. Create `LorebookMultiSelect.tsx` (eliminates duplication)
3. Create `POVSettingsPopover.tsx`
4. Create `ContextToggles.tsx`
5. Create `MatchedEntriesPanel.tsx`
6. Create `GenerationControls.tsx`
7. Update SceneBeatComponent to use extracted components
8. Test UI interactions

### Step 3: Extract Custom Hooks (High Risk)
1. Create `useLorebookMatching.ts` (replace useEffect with useMemo)
2. Create `useCommandHistory.ts`
3. Create `useSceneBeatSync.ts` (replace side effect useEffects)
4. Create `useSceneBeatData.ts` (consolidate initialization)
5. Create `useSceneBeatGeneration.ts`
6. Update SceneBeatComponent to use extracted hooks
7. Test all functionality thoroughly

### Step 4: Consolidate State (Medium Risk)
1. Group related state variables into objects
2. Eliminate temporary POV state
3. Update all state references
4. Test state updates

### Step 5: Clean Up (Low Risk)
1. Remove dead code (`showAdditionalContext` panel)
2. Add memoization for computed values
3. Fix type safety issues
4. Add ARIA labels
5. Extract constants
6. Remove console.logs
7. Final testing

---

## Testing Strategy

### Unit Tests (New)
- Test extracted hooks in isolation
- Test service functions (prompt config, editor utils)
- Test reusable components with various props

### Integration Tests (Existing)
- Verify scene beat creation/deletion
- Verify command saving
- Verify AI generation flow
- Verify accept/reject functionality
- Verify POV settings
- Verify context toggles
- Verify lorebook matching

### Manual Testing Checklist
- [ ] Create new scene beat
- [ ] Enter command text
- [ ] Verify auto-save works
- [ ] Test undo/redo (Ctrl+Z, Ctrl+Shift+Z)
- [ ] Change POV settings
- [ ] Toggle context options
- [ ] Select custom lorebook items
- [ ] Preview prompt
- [ ] Generate prose
- [ ] Stop generation mid-stream
- [ ] Accept generated content
- [ ] Reject generated content
- [ ] View matched entries panel
- [ ] Delete scene beat
- [ ] Verify all data persists after reload

---

## Success Metrics

### Code Quality Improvements
- **Lines of code**: 1,423 → ~1,200 (distributed across 15+ focused files)
- **Main component size**: 1,260 lines → ~150 lines (89% reduction)
- **State variables**: 40+ → 5 consolidated objects (87% reduction)
- **useEffect hooks**: 8 → 2-3 (62-75% reduction)
- **Duplicated code**: ~200 lines → 0
- **Test coverage**: 0% → 70%+ (new unit tests for hooks/services)

### Maintainability Improvements
- Clear separation of concerns
- Testable business logic
- Reusable components
- Functional programming alignment
- No React antipatterns
- Type-safe throughout

### Performance Improvements
- Reduced re-renders from state consolidation
- Memoized expensive computations
- Eliminated unnecessary effects

---

## Risks & Mitigation

### Risk 1: Breaking Functionality
**Mitigation:** Refactor incrementally, test after each phase, maintain comprehensive manual test checklist

### Risk 2: State Initialization Race Conditions
**Mitigation:** Carefully handle async initialization in `useSceneBeatData` hook, use loading states

### Risk 3: Lexical Editor Context Issues
**Mitigation:** Ensure all extracted hooks that need editor access receive it as parameter, test editor operations thoroughly

### Risk 4: Database Sync Timing Issues
**Mitigation:** Preserve debounce behavior in `useSceneBeatSync`, verify auto-save works correctly

---

## Timeline Estimate

**Omitted per CLAUDE.md operational guidance**

---

## Notes

- Functionality remains **100% unchanged** - purely structural refactoring
- All React antipatterns will be eliminated
- Alignment with CLAUDE.md functional programming principles
- SceneBeatNode class (lines 1354-1422) is justified exception per CLAUDE.md
- Dead code removal saves ~100 lines immediately
- Manual testing required after each phase
