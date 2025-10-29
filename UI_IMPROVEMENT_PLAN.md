# UI/UX Improvement Plan: Model Selection & Generation Flow

## Current State (After Recent Fixes)

### What's Working
- Default model selection per provider (Local/OpenAI/OpenRouter) in AI Settings
- "Use Default Models" button in Prompt Form to quickly populate prompts
- Local model generation now uses selected model (no longer hardcoded)
- System prompts cleaned up (no more confusing "local" placeholder)
- Database migration removes old placeholder models

### Remaining Pain Points
1. **Manual Model Selection Required** - Users must manually select prompt+model every time they want to generate
2. **No Automatic Fallback** - If prompt has no allowed models, generation fails with no helpful guidance
3. **No Session Persistence** - Last-used model isn't remembered between sessions
4. **Two-Step Selection Process** - Must pick prompt → then pick model from submenu
5. **No Visual Indication** - Prompt selection menu doesn't show which model was last used
6. **System Prompts Start Empty** - After migration, all system prompts have zero models until user manually adds them

---

## Improvement Plan

### Phase 1: Intelligent Auto-Selection (High Priority)

**Problem**: Every generation UI (ChatInterface, SceneBeatNode, FloatingTextFormatToolbarPlugin) requires manual prompt+model selection each time.

**Solution**: Implement smart auto-selection logic that prioritizes:
1. Last-used model for this context (stored in localStorage)
2. First allowed model in the prompt
3. Default model for the prompt's primary provider
4. First available default model from any provider

**Implementation**:
```typescript
// Add to each generation UI component
useEffect(() => {
    const lastUsed = localStorage.getItem('lastUsedModel_${context}');
    if (lastUsed) {
        const parsed = JSON.parse(lastUsed);
        setSelectedPrompt(parsed.prompt);
        setSelectedModel(parsed.model);
    } else if (selectedPrompt && !selectedModel) {
        // Auto-select first allowed model
        if (selectedPrompt.allowedModels.length > 0) {
            setSelectedModel(selectedPrompt.allowedModels[0]);
        } else {
            // Fallback to default model
            const defaultModel = getDefaultModelForProvider('local');
            if (defaultModel) setSelectedModel(defaultModel);
        }
    }
}, [selectedPrompt]);

// On successful generation, persist selection
const handleGenerate = async () => {
    // ... generation logic ...
    localStorage.setItem('lastUsedModel_${context}', JSON.stringify({
        prompt: selectedPrompt,
        model: selectedModel
    }));
};
```

**Files to Modify**:
- `src/features/brainstorm/components/ChatInterface.tsx`
- `src/Lexical/lexical-playground/src/nodes/SceneBeatNode.tsx`
- `src/Lexical/lexical-playground/src/plugins/FloatingTextFormatToolbarPlugin/index.tsx`

**Estimated Effort**: 3-4 hours

---

### Phase 2: Improved Prompt Selection Menu (Medium Priority)

**Problem**: Two-step selection (prompt → model) is clunky. No visual feedback about previous usage.

**Solution**: Redesign `prompt-select-menu.tsx` to:
1. Show "last used" indicator on prompts
2. Display currently selected model inline with prompt name
3. Add quick-switch buttons to change model without reopening menu
4. Add keyboard shortcuts (e.g., number keys to select)

**Mockup**:
```
[Prompt Select Menu]
┌─────────────────────────────────────┐
│ Scene Beat                 ⭐ LAST  │
│ ↳ llama-3.1-8b          [Change ▼] │
├─────────────────────────────────────┤
│ Generate Summary                    │
│ ↳ gpt-4o-mini           [Change ▼] │
├─────────────────────────────────────┤
│ Continue Writing                    │
│ ↳ No model selected    [Select ▼]  │
└─────────────────────────────────────┘
```

**Implementation**:
- Redesign menu to show model inline
- Add dropdown to change model without closing menu
- Persist last-used prompt per context
- Add visual "recently used" section at top

**Files to Modify**:
- `src/components/ui/prompt-select-menu.tsx`

**Estimated Effort**: 4-6 hours

---

### Phase 3: Graceful Fallback for Empty Prompts (High Priority)

**Problem**: Prompts with no allowed models cause silent failures or unhelpful errors.

**Solution**: Add fallback logic at generation time:

```typescript
// In useAIStore.generateWithPrompt
const resolvedModel = selectedModel || await resolveDefaultModel(prompt);

if (!resolvedModel) {
    throw new Error(
        'No model available for this prompt. Please add models in Prompt Settings or configure default models in AI Settings.'
    );
}
```

**Implementation**:
- Add `resolveDefaultModel(prompt)` helper function
- Check prompt's allowed models → default model by provider → any available model
- Show helpful toast with link to AI Settings/Prompt Manager

**Files to Modify**:
- `src/features/ai/stores/useAIStore.ts`
- Add helper: `src/features/ai/utils/modelResolution.ts`

**Estimated Effort**: 2-3 hours

---

### Phase 4: System Prompt Auto-Population (Low Priority)

**Problem**: After database migration, system prompts have empty `allowedModels`, requiring manual setup.

**Solution**: On app startup, auto-populate system prompts with default models if:
1. Prompt has zero allowed models
2. User has configured at least one default model

**Implementation**:
```typescript
// Add to database.ts or create migration utility
async function populateSystemPromptsWithDefaults() {
    const settings = await db.aiSettings.toArray();
    const defaults = settings[0];

    if (!defaults?.defaultLocalModel && !defaults?.defaultOpenAIModel && !defaults?.defaultOpenRouterModel) {
        return; // No defaults configured yet
    }

    const systemPrompts = await db.prompts.where('isSystem').equals(true).toArray();

    for (const prompt of systemPrompts) {
        if (!prompt.allowedModels || prompt.allowedModels.length === 0) {
            const defaultModels = await getConfiguredDefaultModels();
            await db.prompts.update(prompt.id, {
                allowedModels: defaultModels
            });
        }
    }
}
```

**Run**: On app initialization after AI settings load

**Files to Modify**:
- `src/services/database.ts` or create `src/utils/promptMigration.ts`
- Call from `src/App.tsx` or `src/features/ai/stores/useAIStore.ts` init

**Estimated Effort**: 2-3 hours

---

### Phase 5: Quick Model Switcher (Low Priority)

**Problem**: Switching models mid-conversation requires reopening prompt menu.

**Solution**: Add persistent model switcher dropdown in generation UIs:

**Mockup**:
```
┌─────────────────────────────────────────┐
│ Brainstorm: Scene Beat                  │
│ [llama-3.1-8b ▼]         [Generate →]  │
└─────────────────────────────────────────┘
```

**Implementation**:
- Show currently selected model in dropdown
- Clicking opens menu of prompt's allowed models
- Changes take effect immediately
- Persisted to localStorage

**Files to Modify**:
- All generation UI components
- Create reusable `<ModelSwitcher>` component

**Estimated Effort**: 3-4 hours

---

### Phase 6: Model Availability Validation (Medium Priority)

**Problem**: Prompts can reference models that no longer exist (API key removed, model deprecated, etc.).

**Solution**: Add validation and cleanup:

1. **On Prompt Load**:
   - Check if allowed models still exist in `availableModels`
   - Show warning badge if any models are missing
   - Offer "Remove unavailable models" button

2. **On Model Refresh** (AI Settings):
   - Scan all prompts using removed models
   - Show notification: "3 prompts use models that are no longer available"
   - Offer bulk action to clear or replace

3. **On Generation Attempt**:
   - Validate selected model still exists
   - If not, show error with link to prompt settings

**Implementation**:
```typescript
// Add to PromptForm
const unavailableModels = selectedModels.filter(
    selected => !availableModels.some(avail => avail.id === selected.id)
);

if (unavailableModels.length > 0) {
    return (
        <Alert variant="warning">
            {unavailableModels.length} model(s) no longer available.
            <Button onClick={removeUnavailableModels}>Remove</Button>
        </Alert>
    );
}
```

**Files to Modify**:
- `src/features/prompts/components/PromptForm.tsx`
- `src/features/ai/pages/AISettingsPage.tsx`
- Add validation utilities

**Estimated Effort**: 4-5 hours

---

## Quick Wins (Can Implement Immediately)

### 1. Better Empty State Messaging
When prompts have no models selected, show helpful guidance:
```tsx
{selectedModels.length === 0 && (
    <Alert>
        No models selected.
        <Button onClick={handleUseDefaultModels}>Use Default Models</Button>
        or select manually below.
    </Alert>
)}
```

**Effort**: 30 minutes

---

### 2. Model Count Badge in Prompt List
Show how many models each prompt has:
```tsx
<div className="prompt-card">
    Scene Beat
    <Badge>{prompt.allowedModels.length} models</Badge>
</div>
```

**Effort**: 30 minutes

---

### 3. Keyboard Shortcuts
Add shortcuts for common actions:
- `Cmd/Ctrl + Enter` - Generate with current prompt+model
- `Cmd/Ctrl + K` - Open prompt selector
- `Cmd/Ctrl + M` - Open model switcher

**Effort**: 1-2 hours

---

### 4. Toast Notification Improvements
Make generation errors more actionable:
```typescript
toast.error(
    'No model selected',
    {
        action: {
            label: 'Configure',
            onClick: () => navigate('/ai-settings')
        }
    }
);
```

**Effort**: 1 hour

---

## Testing Checklist

### After Phase 1 (Auto-Selection)
- [ ] ChatInterface remembers last-used model across sessions
- [ ] SceneBeatNode auto-selects first model when prompt chosen
- [ ] FloatingToolbar falls back to default model if prompt empty
- [ ] localStorage persists separately per context (chat vs scene beat vs toolbar)

### After Phase 2 (Menu Redesign)
- [ ] Prompt menu shows currently selected model inline
- [ ] Can change model without closing menu
- [ ] Last-used prompt marked with indicator
- [ ] Keyboard navigation works

### After Phase 3 (Fallback Logic)
- [ ] Generating with empty prompt shows helpful error
- [ ] Error message includes link to settings
- [ ] Fallback uses default model when available
- [ ] No silent failures

### After Phase 4 (Auto-Population)
- [ ] Fresh install populates system prompts after setting default model
- [ ] Existing installs populate on next launch
- [ ] Respects user's configured defaults
- [ ] Doesn't override manually selected models

### After Phase 5 (Quick Switcher)
- [ ] Model dropdown visible in all generation UIs
- [ ] Shows all allowed models for current prompt
- [ ] Changes take effect immediately
- [ ] Disabled when no prompt selected

### After Phase 6 (Validation)
- [ ] Prompt form warns about unavailable models
- [ ] AI Settings shows affected prompts after model removal
- [ ] Generation fails gracefully with clear error
- [ ] Cleanup tools work correctly

---

## Migration Guide for Existing Users

When these improvements ship, users should:

1. **Immediate (One-Time Setup)**:
   - Go to AI Settings
   - Set default model for each provider used
   - All system prompts will auto-populate with defaults

2. **Optional (For Better Experience)**:
   - Review custom prompts and click "Use Default Models" if needed
   - Try generating - first model will be remembered for next time

3. **No Breaking Changes**:
   - Existing prompt configurations remain intact
   - Manual model selection still works as before
   - New features are purely additive enhancements

---

## Performance Considerations

### LocalStorage Usage
- Per-context model persistence: ~1KB per context × 3 contexts = ~3KB
- JSON serialization of prompt+model objects
- Clear strategy: Clear after 30 days of inactivity

### Database Queries
- Model validation adds one query per prompt load
- Consider caching available models in memory
- Debounce validation when typing in model search

### Re-render Optimization
- Memoize model filtering/grouping logic
- Use `useMemo` for expensive computations
- Lazy load model lists in dropdowns

---

## Accessibility Improvements

### Keyboard Navigation
- Tab through prompt selection
- Arrow keys to navigate model list
- Enter to select, Escape to close
- Focus management when opening/closing dialogs

### Screen Reader Support
- Announce when model auto-selected
- Label all interactive elements
- Provide status updates during generation
- Clear error messages

### Visual Indicators
- High contrast for selected items
- Loading states clearly visible
- Error states use color + icon + text
- Success feedback for all actions

---

## Future Considerations

### Model Presets
Allow users to create named presets:
- "Fast & Cheap" - gpt-4o-mini
- "High Quality" - claude-3-opus
- "Local" - llama-3.1-70b

Quickly switch between presets per prompt or globally.

### Model Performance Tracking
Track which models users prefer:
- Usage frequency
- Average generation time
- Success/error rates
- User ratings

Surface insights: "You usually use gpt-4o-mini for summaries"

### Prompt Templates with Recommended Models
Ship prompt templates with pre-configured model recommendations:
- "Poetry Generator" → Claude (creative)
- "Code Review" → GPT-4 (analytical)
- "Quick Summary" → Fast local model

### Multi-Model Comparison
Generate with multiple models simultaneously:
- Show results side-by-side
- Vote on best output
- Learn preferences over time

---

## Implementation Priority

1. **Phase 1** - Auto-selection (solves biggest pain point)
2. **Phase 3** - Fallback logic (prevents errors)
3. **Quick Wins** - Low-hanging fruit for immediate improvement
4. **Phase 6** - Validation (prevents future issues)
5. **Phase 2** - Menu redesign (polish)
6. **Phase 4** - Auto-population (convenience)
7. **Phase 5** - Quick switcher (nice-to-have)

Total estimated effort: **20-30 hours** for all phases
