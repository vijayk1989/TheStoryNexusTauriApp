import { StoryDatabase, db } from '@/services/database';
import {
    PromptMessage,
    PromptParserConfig,
    ParsedPrompt,
    PromptContext,
} from '@/types/story';
import { useLorebookStore } from '@/features/lorebook/stores/useLorebookStore';
import { ContextBuilder } from './ContextBuilder';
import {
    VariableResolverRegistry,
    LorebookFormatter,
    ChapterSummariesResolver,
    PreviousWordsResolver,
    ChapterContentResolver,
    ChapterOutlineResolver,
    ChapterDataResolver,
    MatchedEntriesChapterResolver,
    SceneBeatMatchedEntriesResolver,
    AllEntriesResolver,
    CharacterResolver,
    AllCharactersResolver,
    AllLocationsResolver,
    AllItemsResolver,
    AllEventsResolver,
    AllNotesResolver,
    AllSynopsisResolver,
    AllStartingScenariosResolver,
    AllTimelinesResolver,
    SceneBeatContextResolver,
    PoVResolver,
    SelectedTextResolver,
    StoryLanguageResolver,
    SceneBeatResolver,
    ChatHistoryResolver,
    UserInputResolver,
    BrainstormContextResolver,
} from './resolvers';

export class PromptParser {
    private readonly registry: VariableResolverRegistry;
    private readonly contextBuilder: ContextBuilder;
    private readonly formatter: LorebookFormatter;

    constructor(private database: StoryDatabase) {
        this.contextBuilder = new ContextBuilder(database);
        this.formatter = new LorebookFormatter();
        this.registry = this.initializeRegistry();
    }

    private initializeRegistry(): VariableResolverRegistry {
        const registry = new VariableResolverRegistry();

        // Chapter resolvers
        registry.register('summaries', new ChapterSummariesResolver());
        registry.register('previous_words', new PreviousWordsResolver());
        registry.register('chapter_content', new ChapterContentResolver());
        registry.register('chapter_outline', new ChapterOutlineResolver());
        registry.register('chapter_data', new ChapterDataResolver());

        // Lorebook resolvers
        registry.register('matched_entries_chapter', new MatchedEntriesChapterResolver(this.formatter));
        registry.register('lorebook_chapter_matched_entries', new MatchedEntriesChapterResolver(this.formatter));
        registry.register('lorebook_data', new MatchedEntriesChapterResolver(this.formatter));
        registry.register('lorebook_scenebeat_matched_entries', new SceneBeatMatchedEntriesResolver(this.formatter));
        registry.register('all_entries', new AllEntriesResolver(this.formatter));
        registry.register('character', new CharacterResolver(this.formatter));
        registry.register('all_characters', new AllCharactersResolver(this.formatter));
        registry.register('all_locations', new AllLocationsResolver(this.formatter));
        registry.register('all_items', new AllItemsResolver(this.formatter));
        registry.register('all_events', new AllEventsResolver(this.formatter));
        registry.register('all_notes', new AllNotesResolver(this.formatter));
        registry.register('all_synopsis', new AllSynopsisResolver(this.formatter));
        registry.register('all_starting_scenarios', new AllStartingScenariosResolver(this.formatter));
        registry.register('all_timelines', new AllTimelinesResolver(this.formatter));
        registry.register('scenebeat_context', new SceneBeatContextResolver(this.formatter));

        // Metadata resolvers
        registry.register('pov', new PoVResolver());
        registry.register('selected_text', new SelectedTextResolver());
        registry.register('selection', new SelectedTextResolver());
        registry.register('story_language', new StoryLanguageResolver());
        registry.register('scenebeat', new SceneBeatResolver());

        // Brainstorm resolvers
        registry.register('chat_history', new ChatHistoryResolver());
        registry.register('user_input', new UserInputResolver());
        registry.register('brainstorm_context', new BrainstormContextResolver(this.formatter));

        return registry;
    }

    async parse(config: PromptParserConfig): Promise<ParsedPrompt> {
        try {
            const prompt = await this.database.prompts.get(config.promptId);
            if (!prompt) throw new Error('Prompt not found');

            const context = await this.contextBuilder.buildContext(config);
            const parsedMessages = await this.parseMessages(prompt.messages, context);

            return { messages: parsedMessages };
        } catch (error) {
            console.error('Error parsing prompt:', error);
            return {
                messages: [],
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    private async parseMessages(messages: PromptMessage[], context: PromptContext): Promise<PromptMessage[]> {
        return Promise.all(messages.map(async message => ({
            ...message,
            content: await this.parseContent(message.content, context)
        })));
    }

    private async parseContent(content: string, context: PromptContext): Promise<string> {
        let parsedContent = content.replace(/\/\*[\s\S]*?\*\//g, '');

        const functionRegex = /\{\{(\w+)\((.*?)\)\}\}/g;
        const matches = Array.from(parsedContent.matchAll(functionRegex));

        for (const match of matches) {
            const [fullMatch, func, args] = match;
            if (func === 'previous_words') {
                const resolved = await this.registry.resolve('previous_words', context, args.trim());
                parsedContent = parsedContent.replace(fullMatch, resolved);
            }
            if (func === 'chapter_data') {
                const resolved = await this.registry.resolve('chapter_data', context, args.trim());
                parsedContent = parsedContent.replace(fullMatch, resolved);
            }
        }

        if (parsedContent.includes('{{matched_entries_chapter}}') &&
            parsedContent.includes('{{additional_scenebeat_context}}')) {

            let matchedEntries = '';
            if (context.chapterMatchedEntries && context.chapterMatchedEntries.size > 0) {
                const entries = Array.from(context.chapterMatchedEntries);
                entries.sort((a, b) => {
                    const importanceOrder = { 'major': 0, 'minor': 1, 'background': 2 };
                    const aImportance = a.metadata?.importance || 'background';
                    const bImportance = b.metadata?.importance || 'background';
                    return importanceOrder[aImportance] - importanceOrder[bImportance];
                });
                matchedEntries = this.formatter.formatEntries(entries);
            }

            let additionalContext = '';
            if (context.additionalContext?.selectedItems && context.additionalContext.selectedItems.length > 0) {
                const selectedItemIds = context.additionalContext.selectedItems as string[];
                const lorebookStore = useLorebookStore.getState();
                const entries = lorebookStore.entries.filter(entry => selectedItemIds.includes(entry.id));

                const existingEntryIds = new Set<string>();

                if (context.chapterMatchedEntries) {
                    Array.from(context.chapterMatchedEntries.values()).forEach(entry => {
                        existingEntryIds.add(entry.id);
                    });
                }

                const uniqueEntries = entries.filter(entry => !existingEntryIds.has(entry.id));

                if (uniqueEntries.length > 0) {
                    additionalContext = this.formatter.formatEntries(uniqueEntries);
                }
            }

            let combinedResult = '';
            if (matchedEntries && additionalContext) {
                combinedResult = matchedEntries + '\n\n' + additionalContext;
            } else if (matchedEntries) {
                combinedResult = matchedEntries;
            } else if (additionalContext) {
                combinedResult = additionalContext;
            }

            parsedContent = parsedContent.replace(/\{\{matched_entries_chapter\}\}[\s\n]*\{\{[\s\n]*additional_scenebeat_context[\s\n]*\}\}/g, combinedResult);
            parsedContent = parsedContent.replace(/\{\{[\s\n]*additional_scenebeat_context[\s\n]*\}\}[\s\n]*\{\{matched_entries_chapter\}\}/g, combinedResult);

            parsedContent = parsedContent.replace(/\{\{matched_entries_chapter\}\}/g, '');
            parsedContent = parsedContent.replace(/\{\{[\s\n]*additional_scenebeat_context[\s\n]*\}\}/g, '');
        } else {
            parsedContent = await this.parseRegularVariables(parsedContent, context);
        }

        parsedContent = parsedContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

        return parsedContent;
    }

    private async parseRegularVariables(content: string, context: PromptContext): Promise<string> {
        const variableRegex = /\{\{([^}]+)\}\}/g;
        let result = content;

        const matches = Array.from(content.matchAll(variableRegex));

        for (const match of matches) {
            const [fullMatch, variable] = match;
            const [varName, ...params] = variable.trim().split(' ');

            if (varName === 'scenebeat' && context.scenebeat) {
                result = result.replace(fullMatch, context.scenebeat);
                continue;
            }

            if (varName.startsWith('all_') && this.registry.has(varName)) {
                const resolved = await this.registry.resolve(varName, context);
                result = result.replace(fullMatch, resolved);
                continue;
            }

            if (varName === 'character' && params.length > 0) {
                const characterName = params.join(' ');
                const resolved = await this.registry.resolve('character', context, characterName);
                result = result.replace(fullMatch, resolved);
                continue;
            }

            if (this.registry.has(varName)) {
                const resolved = await this.registry.resolve(varName, context, ...params);
                result = result.replace(fullMatch, resolved || '');
            } else {
                console.warn(`Unknown variable: ${varName}`);
                result = result.replace(fullMatch, `[Unknown variable: ${varName}]`);
            }
        }

        return result;
    }
}

export const createPromptParser = () => new PromptParser(db);
