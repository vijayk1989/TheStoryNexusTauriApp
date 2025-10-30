import { StoryDatabase, db } from '@/services/database';
import {
    PromptMessage,
    PromptParserConfig,
    ParsedPrompt,
    PromptContext,
} from '@/types/story';
import { useLorebookStore } from '@/features/lorebook/stores/useLorebookStore';
import { ContextBuilder } from './ContextBuilder';
import { attemptPromise } from '@jfdi/attempt';
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
        const [promptError, prompt] = await attemptPromise(() =>
            this.database.prompts.get(config.promptId)
        );

        if (promptError || !prompt) {
            return {
                messages: [],
                error: promptError?.message || 'Prompt not found'
            };
        }

        const [contextError, context] = await attemptPromise(() =>
            this.contextBuilder.buildContext(config)
        );

        if (contextError) {
            return {
                messages: [],
                error: contextError.message
            };
        }

        const [parseError, parsedMessages] = await attemptPromise(() =>
            this.parseMessages(prompt.messages, context)
        );

        if (parseError) {
            return {
                messages: [],
                error: parseError.message
            };
        }

        return { messages: parsedMessages };
    }

    private async parseMessages(messages: PromptMessage[], context: PromptContext): Promise<PromptMessage[]> {
        return Promise.all(messages.map(async message => ({
            ...message,
            content: await this.parseContent(message.content, context)
        })));
    }

    private async parseContent(content: string, context: PromptContext): Promise<string> {
        const withoutComments = content.replace(/\/\*[\s\S]*?\*\//g, '');

        const functionRegex = /\{\{(\w+)\((.*?)\)\}\}/g;
        const matches = Array.from(withoutComments.matchAll(functionRegex));

        const withFunctionsResolved = await matches.reduce(async (accPromise, match) => {
            const acc = await accPromise;
            const [fullMatch, func, args] = match;

            if (func === 'previous_words') {
                const resolved = await this.registry.resolve('previous_words', context, args.trim());
                return acc.replace(fullMatch, resolved);
            }
            if (func === 'chapter_data') {
                const resolved = await this.registry.resolve('chapter_data', context, args.trim());
                return acc.replace(fullMatch, resolved);
            }
            return acc;
        }, Promise.resolve(withoutComments));

        const hasSpecialCombination = withFunctionsResolved.includes('{{matched_entries_chapter}}') &&
            withFunctionsResolved.includes('{{additional_scenebeat_context}}');

        const withVariablesResolved = hasSpecialCombination
            ? await this.parseSpecialCombination(withFunctionsResolved, context)
            : await this.parseRegularVariables(withFunctionsResolved, context);

        return withVariablesResolved.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    }

    private async parseSpecialCombination(content: string, context: PromptContext): Promise<string> {
        const matchedEntries = this.getMatchedEntriesFormatted(context);
        const additionalContext = this.getAdditionalContextFormatted(context);

        const combinedResult = [matchedEntries, additionalContext]
            .filter(Boolean)
            .join('\n\n');

        return content
            .replace(/\{\{matched_entries_chapter\}\}[\s\n]*\{\{[\s\n]*additional_scenebeat_context[\s\n]*\}\}/g, combinedResult)
            .replace(/\{\{[\s\n]*additional_scenebeat_context[\s\n]*\}\}[\s\n]*\{\{matched_entries_chapter\}\}/g, combinedResult)
            .replace(/\{\{matched_entries_chapter\}\}/g, '')
            .replace(/\{\{[\s\n]*additional_scenebeat_context[\s\n]*\}\}/g, '');
    }

    private getMatchedEntriesFormatted(context: PromptContext): string {
        if (!context.chapterMatchedEntries || context.chapterMatchedEntries.size === 0) {
            return '';
        }

        const entries = Array.from(context.chapterMatchedEntries);
        const sorted = entries.sort((a, b) => {
            const importanceOrder = { 'major': 0, 'minor': 1, 'background': 2 };
            const aImportance = a.metadata?.importance || 'background';
            const bImportance = b.metadata?.importance || 'background';
            return importanceOrder[aImportance] - importanceOrder[bImportance];
        });

        return this.formatter.formatEntries(sorted);
    }

    private getAdditionalContextFormatted(context: PromptContext): string {
        const selectedItems = context.additionalContext?.selectedItems;
        if (!selectedItems || !Array.isArray(selectedItems) || selectedItems.length === 0) {
            return '';
        }

        const selectedItemIds = selectedItems as string[];
        const lorebookStore = useLorebookStore.getState();
        const entries = lorebookStore.entries.filter(entry => selectedItemIds.includes(entry.id));

        const existingEntryIds = context.chapterMatchedEntries
            ? new Set(Array.from(context.chapterMatchedEntries).map(entry => entry.id))
            : new Set<string>();

        const uniqueEntries = entries.filter(entry => !existingEntryIds.has(entry.id));

        return uniqueEntries.length > 0 ? this.formatter.formatEntries(uniqueEntries) : '';
    }

    private async parseRegularVariables(content: string, context: PromptContext): Promise<string> {
        const variableRegex = /\{\{([^}]+)\}\}/g;
        const matches = Array.from(content.matchAll(variableRegex));

        return await matches.reduce(async (accPromise, match) => {
            const acc = await accPromise;
            const [fullMatch, variable] = match;
            const [varName, ...params] = variable.trim().split(' ');

            if (varName === 'scenebeat' && context.scenebeat) {
                return acc.replace(fullMatch, context.scenebeat);
            }

            if (varName.startsWith('all_') && this.registry.has(varName)) {
                const resolved = await this.registry.resolve(varName, context);
                return acc.replace(fullMatch, resolved);
            }

            if (varName === 'character' && params.length > 0) {
                const characterName = params.join(' ');
                const resolved = await this.registry.resolve('character', context, characterName);
                return acc.replace(fullMatch, resolved);
            }

            if (this.registry.has(varName)) {
                const resolved = await this.registry.resolve(varName, context, ...params);
                return acc.replace(fullMatch, resolved || '');
            }

            console.warn(`Unknown variable: ${varName}`);
            return acc.replace(fullMatch, `[Unknown variable: ${varName}]`);
        }, Promise.resolve(content));
    }
}

export const createPromptParser = () => new PromptParser(db);
