# AgentOrchestrator

The `AgentOrchestrator` is the core engine for multi-agent AI pipelines in TheStoryNexus. It coordinates multiple specialized AI agents to work together on story generation tasks, enabling workflows like: summarize context → write prose → check lore consistency → revise if needed.

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AgentOrchestrator                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   PipelineInput ──► [Step 1] ──► [Step 2] ──► [Step 3] ──► Result  │
│                     Summarizer   ProseWriter   LoreJudge            │
│                        │            │             │                 │
│                        ▼            ▼             ▼                 │
│                   (silent)      (stream)      (silent)              │
│                                                                     │
│   Conditions can skip steps or trigger revisions                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Agent Roles

| Role | Purpose | Typical Model |
|------|---------|---------------|
| `summarizer` | Condenses long context to ~1000 words | Low-cost (GLM-4 Flash) |
| `prose_writer` | Generates story prose from scene beats | Creative (DeepSeek V3) |
| `lore_judge` | Validates prose against lorebook | Low-cost |
| `continuity_checker` | Checks for plot holes & timeline issues | Low-cost |
| `style_editor` | Polishes prose for style & flow | Creative |
| `dialogue_specialist` | Improves dialogue authenticity | Creative |
| `expander` | Expands brief notes into full prose | Creative |
| `custom` | User-defined agent | Any |

### Pipeline Steps

Each step in a pipeline has:

```typescript
interface ExecutablePipelineStep {
    agent: AgentPreset;      // The agent configuration
    condition?: string;       // When to run this step
    streamOutput?: boolean;   // Stream tokens to UI (default: false)
    isRevision?: boolean;     // Is this a revision step?
    maxIterations?: number;   // For future iteration support
}
```

### Streaming Behavior

- **`streamOutput: false` (default)**: Agent runs silently, output stored internally
- **`streamOutput: true`**: Tokens stream to the UI in real-time

**Best practice**: Only stream prose-generating agents (prose_writer, style_editor, dialogue_specialist). Judges and checkers should run silently.

## Conditions

Steps can be conditionally executed based on the pipeline state:

| Condition | Description | Example |
|-----------|-------------|---------|
| `wordCount > N` | Input text exceeds N words | `wordCount > 3000` |
| `wordCount < N` | Input text under N words | `wordCount < 500` |
| `hasPreviousOutput` | Any previous step produced output | - |
| `hasLorebookEntries` | Lorebook entries were provided | - |
| `previousOutputContains:TEXT` | Last step's output contains TEXT | `previousOutputContains:ISSUE` |
| `previousOutputNotContains:TEXT` | Last step's output doesn't contain TEXT | `previousOutputNotContains:CONSISTENT` |
| `roleOutputContains:ROLE:TEXT` | Specific role's output contains TEXT | `roleOutputContains:lore_judge:ISSUE` |
| `anyJudgeFoundIssues` | **Any** judge/checker found issues | - |

**Note**: All text matching is case-insensitive.

### `anyJudgeFoundIssues` Condition

This special condition checks if **any** judge role (lore_judge, continuity_checker, or custom roles containing "judge" or "checker") found issues. It looks for these markers in judge outputs:
- `ISSUE`
- `INCONSISTEN` (catches INCONSISTENT/INCONSISTENCY)
- `ERROR`
- `PROBLEM`
- `CONFLICT`

This is ideal for multi-judge pipelines where you want a single revision step after multiple judges:

```
Summarizer → Prose Writer → Lore Judge → Continuity Checker → Prose Writer (revision)
                                                                    │
                                                        condition: anyJudgeFoundIssues
```

## Revision Workflow

The orchestrator supports revision loops where prose is rewritten based on feedback:

```
┌──────────────┐     ┌─────────────┐     ┌────────────┐
│ Prose Writer │ ──► │ Lore Judge  │ ──► │  Revision  │
│  (stream)    │     │  (silent)   │     │  (stream)  │
└──────────────┘     └─────────────┘     └────────────┘
                            │                   │
                            ▼                   │
                     Output contains      Only runs if
                       "ISSUE"?           condition met
```

**Revision step configuration:**
```typescript
{
    role: 'prose_writer',
    condition: 'roleOutputContains:lore_judge:ISSUE',
    isRevision: true,
    streamOutput: true
}
```

When `isRevision: true`, the prose writer receives:
1. The original prose
2. Feedback from judges (lore_judge, continuity_checker)
3. Instruction to rewrite addressing the issues

## PipelineInput

Data passed into the pipeline:

```typescript
interface PipelineInput {
    scenebeat?: string;              // The scene beat instruction
    previousWords?: string;          // Previous story text
    lorebookEntries?: LorebookEntry[]; // Matched lorebook entries
    allLorebookEntries?: LorebookEntry[]; // All entries (for judges)
    povType?: string;                // POV type
    povCharacter?: string;           // POV character name
    currentChapter?: Chapter;        // Current chapter data
    storyLanguage?: string;          // Story language
    customData?: Record<string, unknown>; // Extensibility
}
```

## PipelineResult

Output from pipeline execution:

```typescript
interface PipelineResult {
    finalOutput: string;    // Last step's output (might be judge output)
    proseOutput?: string;   // Last prose-generating agent's output
    steps: AgentResult[];   // All step results with timing
    totalDuration: number;  // Total execution time (ms)
    status: 'completed' | 'failed' | 'aborted';
    error?: string;         // Error message if failed
}
```

**Important**: Use `proseOutput` for the user-facing content, not `finalOutput`. If the last step is a judge, `finalOutput` would be "CONSISTENT" instead of the story!

## Usage Examples

### Basic Usage

```typescript
import { agentOrchestrator } from '@/services/ai/AgentOrchestrator';

const result = await agentOrchestrator.executePipelinePreset(
    pipelineId,
    {
        scenebeat: "The hero discovers a hidden door",
        previousWords: "...(story text)...",
        lorebookEntries: matchedEntries,
    },
    {
        onStepStart: (step, index) => {
            console.log(`Running: ${step.agent.name}`);
        },
        onStepComplete: (result, index) => {
            console.log(`Completed: ${result.role} in ${result.duration}ms`);
        },
        onToken: (token) => {
            // Append to UI
            setStreamedText(prev => prev + token);
        },
    }
);

// Use proseOutput for the story content
const storyContent = result.proseOutput || result.finalOutput;
```

### Aborting Execution

```typescript
// Start pipeline
const resultPromise = agentOrchestrator.executePipelinePreset(...);

// User clicks "Stop"
agentOrchestrator.abort();

// Result will have status: 'aborted'
const result = await resultPromise;
```

## System Pipelines

Pre-built pipelines seeded automatically:

| Pipeline | Steps | Use Case |
|----------|-------|----------|
| **Quick Draft** | prose_writer (stream) | Fast, no quality checks |
| **Quality Prose with Lore Check** | summarizer? → prose_writer (stream) → lore_judge | Standard quality |
| **Quality Prose with Revision** | summarizer? → prose_writer (stream) → lore_judge → revision? (stream) | Best for lore-heavy stories |
| **Polished Output** | prose_writer → style_editor (stream) | Final draft quality |
| **Full Quality Pipeline** | summarizer? → prose_writer (stream) → lore_judge → continuity_checker → revision? (stream) | Maximum quality |
| **Dialogue Polish** | prose_writer → dialogue_specialist (stream) | Dialogue-heavy scenes |

**Note**: `?` indicates conditional steps (only run if condition met).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SceneBeatNode                           │
│                    (Lexical Editor Component)                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    useAgenticGeneration Hook                    │
│              (React hook for state management)                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AgentOrchestrator                          │
│               (Pipeline execution engine)                       │
│                                                                 │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│   │ buildMessages│  │evaluateCondition│  │ callModel │          │
│   └─────────────┘  └─────────────┘  └─────────────┘            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         AIService                               │
│            (Low-level API calls to providers)                   │
│                                                                 │
│   Local │ OpenAI │ OpenRouter │ OpenAI-Compatible              │
└─────────────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `src/services/ai/AgentOrchestrator.ts` | Main orchestrator class |
| `src/features/agents/hooks/useAgenticGeneration.ts` | React hook wrapper |
| `src/features/agents/stores/useAgentsStore.ts` | Zustand store for presets |
| `src/features/agents/services/agentSeeder.ts` | System preset seeding |
| `src/types/story.ts` | Type definitions |

## Future Enhancements

- [ ] **Multi-iteration loops**: Retry revision until judge passes or max iterations
- [ ] **Parallel steps**: Run independent agents concurrently
- [ ] **Branching logic**: Different paths based on conditions
- [ ] **Cost tracking**: Track token usage per agent
- [ ] **Caching**: Cache summarizer output for the session
