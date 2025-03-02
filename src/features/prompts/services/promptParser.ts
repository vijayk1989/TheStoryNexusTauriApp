import { StoryDatabase, db } from '@/services/database';
import {
    Chapter,
    LorebookEntry,
    Prompt,
    PromptMessage,
    PromptParserConfig,
    ParsedPrompt,
    PromptContext,
    VariableResolver
} from '@/types/story';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';

export class PromptParser {
    private readonly variableResolvers: Record<string, VariableResolver>;

    constructor(private database: StoryDatabase) {
        this.variableResolvers = {
            'matched_entries_chapter': this.resolveMatchedEntriesChapter.bind(this),
            'lorebook_chapter_matched_entries': this.resolveMatchedEntriesChapter.bind(this),
            'lorebook_scenebeat_matched_entries': this.resolveLorebookSceneBeatEntries.bind(this),
            'lorebook_data': this.resolveMatchedEntriesChapter.bind(this),
            'summaries': this.resolveChapterSummaries.bind(this),
            'previous_words': this.resolvePreviousWords.bind(this),
            'pov': this.resolvePoV.bind(this),
            'chapter_content': this.resolveChapterContent.bind(this),
            'selected_text': this.resolveSelectedText.bind(this),
            'selection': this.resolveSelectedText.bind(this),
            'story_language': this.resolveStoryLanguage.bind(this),
        };
    }

    async parse(config: PromptParserConfig): Promise<ParsedPrompt> {
        try {
            console.log('Parsing prompt with config:', {
                promptId: config.promptId,
                storyId: config.storyId,
                chapterId: config.chapterId,
                scenebeat: config.scenebeat,
                previousWordsLength: config.previousWords?.length
            });

            const prompt = await this.database.prompts.get(config.promptId);
            if (!prompt) throw new Error('Prompt not found');

            console.log('Found prompt:', {
                name: prompt.name,
                type: prompt.promptType,
                messageCount: prompt.messages.length
            });

            const context = await this.buildContext(config);
            const parsedMessages = await this.parseMessages(prompt.messages, context);

            console.log('Parsed prompt result:', {
                messageCount: parsedMessages.length,
                preview: parsedMessages.map(m => ({
                    role: m.role,
                    contentPreview: m.content
                }))
            });

            return { messages: parsedMessages };
        } catch (error) {
            console.error('Error parsing prompt:', error);
            return {
                messages: [],
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    private async buildContext(config: PromptParserConfig): Promise<PromptContext> {
        const [chapters, currentChapter] = await Promise.all([
            this.database.chapters.where('storyId').equals(config.storyId).toArray(),
            config.chapterId ? this.database.chapters.get(config.chapterId) : undefined
        ]);

        return {
            ...config,
            chapters,
            currentChapter,
            matchedEntries: config.matchedEntries,
            povCharacter: config.povCharacter || currentChapter?.povCharacter,
            povType: config.povType || currentChapter?.povType || 'Third Person Omniscient'
        };
    }

    private async parseMessages(messages: PromptMessage[], context: PromptContext): Promise<PromptMessage[]> {
        return Promise.all(messages.map(async message => ({
            ...message,
            content: await this.parseContent(message.content, context)
        })));
    }

    private async parseContent(content: string, context: PromptContext): Promise<string> {
        // First remove comments
        let parsedContent = content.replace(/\/\*[\s\S]*?\*\//g, '');

        console.log('Parsing content with variables:', {
            originalLength: content.length,
            withoutComments: parsedContent.length,
            variables: parsedContent.match(/\{\{[^}]+\}\}/g)
        });

        // Handle function-style variables first
        const functionRegex = /\{\{(\w+)\((.*?)\)\}\}/g;
        const matches = Array.from(parsedContent.matchAll(functionRegex));

        for (const match of matches) {
            const [fullMatch, func, args] = match;
            if (func === 'previous_words') {
                const resolved = await this.resolvePreviousWords(context, args.trim());
                parsedContent = parsedContent.replace(fullMatch, resolved);
            }
        }

        // Handle regular variables
        parsedContent = await this.parseRegularVariables(parsedContent, context);

        // Clean up any extra whitespace from comment removal
        parsedContent = parsedContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

        return parsedContent;
    }

    private async parseRegularVariables(content: string, context: PromptContext): Promise<string> {
        const variableRegex = /\{\{([^}]+)\}\}/g;
        let result = content;

        const matches = Array.from(content.matchAll(variableRegex));
        console.log('Found variables to parse:', matches.map(m => m[1]));

        for (const match of matches) {
            const [fullMatch, variable] = match;
            const [varName, ...params] = variable.trim().split(' ');

            if (varName === 'scenebeat' && context.scenebeat) {
                result = result.replace(fullMatch, context.scenebeat);
                continue;
            }

            const resolver = this.variableResolvers[varName];
            if (resolver) {
                const resolved = await resolver(context, ...params);
                result = result.replace(fullMatch, resolved);
            } else {
                console.warn(`No resolver found for variable: ${varName}`);
            }
        }

        return result;
    }

    // Variable resolvers
    private async resolveLorebookChapterEntries(context: PromptContext): Promise<string> {
        return this.resolveMatchedEntriesChapter(context);
    }

    private async resolveLorebookSceneBeatEntries(context: PromptContext): Promise<string> {
        console.log('Resolving scene beat matched entries:', {
            hasMatchedEntries: !!context.sceneBeatMatchedEntries,
            entriesSize: context.sceneBeatMatchedEntries?.size,
            entries: Array.from(context.sceneBeatMatchedEntries || []).map(e => ({
                id: e.id,
                name: e.name,
                category: e.category,
                importance: e.metadata?.importance
            }))
        });

        if (!context.sceneBeatMatchedEntries || context.sceneBeatMatchedEntries.size === 0) {
            console.log('No scene beat matched entries found');
            return '';
        }

        const entries = Array.from(context.sceneBeatMatchedEntries);
        entries.sort((a, b) => {
            const importanceOrder = { 'major': 0, 'minor': 1, 'background': 2 };
            const aImportance = a.metadata?.importance || 'background';
            const bImportance = b.metadata?.importance || 'background';
            return importanceOrder[aImportance] - importanceOrder[bImportance];
        });

        return this.formatLorebookEntries(entries);
    }

    private async resolveChapterSummaries(context: PromptContext): Promise<string> {
        if (!context.chapters) return '';

        // Import the chapter store to use our new function
        const { getChapterSummaries } = useChapterStore.getState();

        // Use our new function to get properly formatted summaries
        // If we have a current chapter, use its order, otherwise include all chapters
        if (context.currentChapter) {
            return await getChapterSummaries(context.storyId, context.currentChapter.order);
        } else {
            // If no current chapter, include all chapters
            return await getChapterSummaries(context.storyId, Infinity, true);
        }
    }

    private async resolvePreviousWords(context: PromptContext, count: string = '1000'): Promise<string> {
        console.log('Resolving previous words:', {
            requestedCount: count,
            availableText: context.previousWords?.length || 0
        });

        if (!context.previousWords) return '';

        // Parse the count parameter - default to 1000 if not a valid number
        const requestedWordCount = parseInt(count, 10) || 1000;

        // Split into words and take the last N words
        const words = context.previousWords.split(/\s+/);
        const selectedWords = words.slice(-(requestedWordCount + 1));

        console.log('Selected words:', {
            total: words.length,
            requested: requestedWordCount,
            selected: selectedWords.length
        });

        return selectedWords.join(' ');
    }

    private async resolvePoV(context: PromptContext): Promise<string> {
        // First check if scene beat has specific POV settings
        if (context.povType) {
            const povCharacter = context.povType !== 'Third Person Omniscient' && context.povCharacter
                ? ` (${context.povCharacter})`
                : '';
            return `${context.povType}${povCharacter}`;
        }

        // Fall back to chapter POV if available
        if (context.currentChapter?.povType) {
            const povCharacter = context.currentChapter.povType !== 'Third Person Omniscient' && context.currentChapter.povCharacter
                ? ` (${context.currentChapter.povCharacter})`
                : '';
            return `${context.currentChapter.povType}${povCharacter}`;
        }

        // Default
        return 'Third Person Omniscient';
    }

    private async resolveCharacter(name: string, context: PromptContext): Promise<string> {
        const entries = await this.database.lorebookEntries
            .where('[storyId+category+name]')
            .equals([context.storyId, 'character', name])
            .first();

        return entries ? this.formatLorebookEntries([entries]) : '';
    }

    private async resolveMatchedEntriesChapter(context: PromptContext): Promise<string> {
        console.log('Resolving chapter matched entries:', {
            hasMatchedEntries: !!context.chapterMatchedEntries,
            entriesSize: context.chapterMatchedEntries?.size,
            entries: Array.from(context.chapterMatchedEntries || []).map(e => ({
                id: e.id,
                name: e.name,
                category: e.category,
                importance: e.metadata?.importance
            }))
        });

        if (!context.chapterMatchedEntries || context.chapterMatchedEntries.size === 0) {
            console.log('No chapter matched entries found');
            return '';
        }

        const entries = Array.from(context.chapterMatchedEntries);
        entries.sort((a, b) => {
            const importanceOrder = { 'major': 0, 'minor': 1, 'background': 2 };
            const aImportance = a.metadata?.importance || 'background';
            const bImportance = b.metadata?.importance || 'background';
            return importanceOrder[aImportance] - importanceOrder[bImportance];
        });

        return this.formatLorebookEntries(entries);
    }

    private formatLorebookEntries(entries: LorebookEntry[]): string {
        return entries.map(entry => {
            const metadata = entry.metadata;
            return `${entry.category.toUpperCase()}: ${entry.name}
Type: ${metadata?.type || 'Unknown'}
Importance: ${metadata?.importance || 'Unknown'}
Status: ${metadata?.status || 'Unknown'}
Description: ${entry.description}
${metadata?.relationships?.length ? '\nRelationships:\n' +
                    metadata.relationships.map(r => `- ${r.type}: ${r.description}`).join('\n')
                    : ''}`;
        }).join('\n\n');
    }

    private async resolveChapterContent(context: PromptContext): Promise<string> {
        if (!context.currentChapter) return '';

        // Use the plain text content if available in additionalContext
        if (context.additionalContext?.plainTextContent) {
            console.log('Using plain text content for chapter:', {
                chapterId: context.currentChapter.id,
                contentLength: context.additionalContext.plainTextContent.length,
                preview: context.additionalContext.plainTextContent.slice(0, 100) + '...'
            });
            return context.additionalContext.plainTextContent;
        }

        console.warn('No plain text content found for chapter:', context.currentChapter.id);
        return '';
    }

    private async resolveSelectedText(context: PromptContext): Promise<string> {
        console.log('Resolving selected text:', {
            hasSelectedText: !!context.additionalContext?.selectedText,
            selectedTextLength: context.additionalContext?.selectedText?.length
        });

        if (!context.additionalContext?.selectedText) {
            return '';
        }

        return context.additionalContext.selectedText;
    }

    private async resolveStoryLanguage(context: PromptContext): Promise<string> {
        return context.storyLanguage || 'English';
    }
}

export const createPromptParser = () => new PromptParser(db); 