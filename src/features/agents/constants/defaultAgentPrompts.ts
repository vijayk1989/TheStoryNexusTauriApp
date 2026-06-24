import agentDefaultPrompts from '@/data/agentDefaultPrompts.json';
import type { AgentRole } from '@/types/story';

type SystemAgentPromptRole = Exclude<AgentRole, 'custom' | 'expander'>;
type PromptFileMap<T extends string> = Record<T, string>;

const promptMarkdownFiles = import.meta.glob('../../../data/promptMarkdown/agentPrompts/**/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
}) as Record<string, string>;

function resolveAgentPromptFile(contentFile: string): string {
    const content = promptMarkdownFiles[`../../../data/promptMarkdown/${contentFile}`];
    if (content === undefined) {
        throw new Error(`Agent prompt markdown file not found: ${contentFile}`);
    }

    return content;
}

function resolveAgentPromptFiles<T extends string>(prompts: PromptFileMap<T>): Record<T, string> {
    return Object.fromEntries(
        Object.entries(prompts).map(([role, contentFile]) => [role, resolveAgentPromptFile(contentFile as string)])
    ) as Record<T, string>;
}

export const DEFAULT_AGENT_PROMPTS: Record<AgentRole, string> = resolveAgentPromptFiles(
    agentDefaultPrompts.defaultAgentPrompts as PromptFileMap<AgentRole>
);

export const SYSTEM_AGENT_PROMPTS: Record<SystemAgentPromptRole, string> = resolveAgentPromptFiles(
    agentDefaultPrompts.systemAgentPrompts as PromptFileMap<SystemAgentPromptRole>
);
