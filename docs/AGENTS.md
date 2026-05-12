# Agents

Agents are reusable AI presets that can be chained into pipelines for multi-step writing workflows. They are story-aware, local-first records stored in IndexedDB, and they sit behind the "Agentic Mode" flow used by scene beat generation.

## Where To Find Them

The dashboard routes were removed during the UI overhaul, so agents are now opened from the chapter editor tool sidebar. Click **Agents** in the right tool rail to open the slide-out sheet.

Primary files:

| Area | File |
| --- | --- |
| Agent UI | `src/features/agents/components/AgentsManager.tsx` |
| Agent and pipeline store | `src/features/agents/stores/useAgentsStore.ts` |
| System seed data | `src/features/agents/services/agentSeeder.ts` |
| Pipeline execution engine | `src/services/ai/AgentOrchestrator.ts` |
| React generation hook | `src/features/agents/hooks/useAgenticGeneration.ts` |
| Types | `src/types/story.ts` |
| Scene beat integration | `src/Lexical/lexical-playground/src/nodes/SceneBeatNode.tsx` |

## Concepts

An **agent preset** is one configured AI worker. It has a role, model, system prompt, temperature, max tokens, optional story scope, and a context configuration.

A **pipeline preset** is an ordered list of agent steps. Each step points to an agent preset and can define conditions, streaming behavior, revision behavior, retry metadata, and validation keywords.

An **execution** is one run of a pipeline. The orchestrator returns every step result, the final output, the last prose output, timing, and status.

## Agent Roles

Current roles are:

| Role | Purpose |
| --- | --- |
| `summarizer` | Condenses previous text before expensive generation. |
| `prose_writer` | Writes the main story prose. |
| `lore_judge` | Checks output against lorebook facts. |
| `continuity_checker` | Looks for timeline, plot, and character continuity problems. |
| `style_editor` | Polishes prose style and flow. |
| `dialogue_specialist` | Improves dialogue. |
| `expander` | Turns brief notes or outlines into fuller prose. |
| `outline_generator` | Creates structured story or chapter outlines. |
| `style_extractor` | Extracts style guidance from sample text. |
| `scenebeat_generator` | Generates scene beat commands. |
| `refusal_checker` | Detects refusal/meta responses. |
| `custom` | User-defined behavior. |

## Context Controls

Each agent can decide how much story context it receives:

| Setting | Options | Notes |
| --- | --- | --- |
| `lorebookMode` | `matched`, `all`, `none`, `custom` | Controls lore entries sent to the model. |
| `previousWordsMode` | `full`, `limited`, `summarized`, `none` | Controls previous prose context. |
| `previousWordsLimit` | number | Character limit for limited previous words. |
| `includeChapterSummary` | boolean | Adds the current chapter summary. |
| `includePovInfo` | boolean | Adds POV type and POV character. |

Use narrow context for judges and utility agents. Use richer context for prose writers, outline generators, expanders, and scene beat generators.

## System Pipelines

System agents and pipelines are seeded by `agentSeeder.ts` when presets load. Current pipeline presets include:

| Pipeline | Shape |
| --- | --- |
| Quality Prose with Lore Check | Summarizer when long, prose writer, lore judge. |
| Quality Prose with Revision | Summarizer when long, prose writer, lore judge, conditional revision. |
| Polished Output | Prose writer, style editor. |
| Full Quality Pipeline | Summarizer when long, prose writer, lore judge, continuity checker, conditional revision. |
| Quick Draft | Prose writer only. |
| Dialogue Polish | Prose writer, dialogue specialist. |
| Push Prompt Self-Correction | Summarizer when long, prose writer, refusal checker, conditional corrective rewrite. |

## Step Options

Pipeline steps support:

| Option | Use |
| --- | --- |
| `condition` | Skips or runs a step based on pipeline state. |
| `streamOutput` | Streams token output to the UI. Usually only prose-producing steps should stream. |
| `isRevision` | Treats the step as a rewrite using previous output and feedback. |
| `maxIterations` | Reserved for iterative retry flows. |
| `retryFromStep` | Reserved for loop-style execution. |
| `pushPrompt` | Adds correction text during revision or self-correction. |
| `validationKeywords` | Keywords used by `outputContainsAnyKeyword`. |

Useful conditions include `wordCount > N`, `wordCount < N`, `hasPreviousOutput`, `hasLorebookEntries`, `previousOutputContains:TEXT`, `previousOutputNotContains:TEXT`, `roleOutputContains:ROLE:TEXT`, `anyJudgeFoundIssues`, and `outputContainsAnyKeyword`.

## Runtime Flow

1. `AgentsManager` loads story-scoped and global presets through `useAgentsStore`.
2. Scene beat generation enables Agentic Mode and selects a pipeline.
3. `useAgenticGeneration` gathers scene beat text, previous words, matched lore, chapter, POV, and language context.
4. `AgentOrchestrator.executePipelinePreset` resolves the pipeline and runs steps in order.
5. Each step builds messages from the agent prompt, step input, previous output, and configured context.
6. Streaming steps emit tokens to the editor UI.
7. The caller should prefer `result.proseOutput` for user-facing story text. `finalOutput` may be judge output if the last step is a checker.

## Practical Notes

Only stream writer-like agents. Keep judge and checker steps silent so the UI does not show diagnostic text as prose.

Prefer story-scoped custom agents when the prompt is specific to one project. Keep broadly useful agents global.

When adding a new role, update `AgentRole`, `DEFAULT_CONTEXT_CONFIG`, `DEFAULT_AGENT_PROMPTS`, agent form labels, list labels/colors, and any seed data that should use the role.

When adding a new pipeline condition, update the orchestrator condition evaluator and document the condition here.
