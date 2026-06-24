import systemPromptsData from './systemPrompts.json';
import type { Prompt, PromptMessage } from '../types/story';

type PromptMessageData = Omit<PromptMessage, 'content'> & {
    content?: string;
    contentFile?: string;
};

type SystemPromptData = Omit<Partial<Prompt>, 'messages'> & {
    messages?: PromptMessageData[];
};

const promptMarkdownFiles = import.meta.glob('./promptMarkdown/systemPrompts/**/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
}) as Record<string, string>;

function resolvePromptContent(message: PromptMessageData): string {
    if (message.content !== undefined) {
        return message.content;
    }

    if (!message.contentFile) {
        throw new Error('System prompt message is missing content or contentFile.');
    }

    const content = promptMarkdownFiles[`./promptMarkdown/${message.contentFile}`];
    if (content === undefined) {
        throw new Error(`System prompt markdown file not found: ${message.contentFile}`);
    }

    return content;
}

const systemPrompts = (systemPromptsData as SystemPromptData[]).map((prompt) => ({
    ...prompt,
    messages: prompt.messages?.map((message) => {
        const { contentFile: _contentFile, ...rest } = message;

        return {
            ...rest,
            content: resolvePromptContent(message),
        };
    }),
})) as Partial<Prompt>[];

export default systemPrompts;
