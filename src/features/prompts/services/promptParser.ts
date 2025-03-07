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
import { useLorebookStore } from '@/features/lorebook/stores/useLorebookStore';

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
            'all_entries': this.resolveAllEntries.bind(this),
            'chat_history': this.resolveChatHistory.bind(this),
            'user_input': this.resolveUserInput.bind(this),
            'brainstorm_context': this.resolveBrainstormContext.bind(this),
            'all_characters': this.resolveAllCharacters.bind(this),
            'all_locations': this.resolveAllLocations.bind(this),
            'all_items': this.resolveAllItems.bind(this),
            'all_events': this.resolveAllEvents.bind(this),
            'all_notes': this.resolveAllNotes.bind(this),
        };
    }

    async parse(config: PromptParserConfig): Promise<ParsedPrompt> {
        try {
            console.log('Parsing prompt with config:', {
                promptId: config.promptId,
                storyId: config.storyId,
                chapterId: config.chapterId,
                scenebeat: config.scenebeat,
                previousWordsLength: config.previousWords?.length,
                additionalContext: config.additionalContext ? {
                    includeFullContext: config.additionalContext.includeFullContext,
                    selectedTagsLength: config.additionalContext.selectedTags?.length,
                    selectedCategoriesLength: config.additionalContext.selectedCategories?.length,
                    selectedCategories: config.additionalContext.selectedCategories,
                    selectedTags: config.additionalContext.selectedTags
                } : 'none'
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
        console.log('Building context from config:', {
            storyId: config.storyId,
            chapterId: config.chapterId,
            promptId: config.promptId,
            scenebeat: config.scenebeat,
            additionalContext: config.additionalContext
        });

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
            povType: config.povType || currentChapter?.povType || 'Third Person Omniscient',
            additionalContext: config.additionalContext || {}
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

            // Handle all_* queries
            if (varName.startsWith('all_')) {
                const category = varName.slice(4); // Remove 'all_' prefix
                // Map the category to match the type from story.ts
                const mappedCategory = category === 'characters' ? 'character' :
                    category === 'locations' ? 'location' :
                        category === 'items' ? 'item' :
                            category === 'events' ? 'event' :
                                category === 'notes' ? 'note' : category;

                const entries = await this.resolveAllEntries(context, mappedCategory);
                result = result.replace(fullMatch, entries);
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

    private async resolveAllEntries(context: PromptContext, category?: string): Promise<string> {
        const entries = await this.database.lorebookEntries
            .where('storyId')
            .equals(context.storyId)
            .toArray();

        let filteredEntries = entries;
        if (category) {
            filteredEntries = entries.filter(entry => entry.category === category);
        }

        return this.formatLorebookEntries(filteredEntries);
    }

    private async resolveChatHistory(context: PromptContext): Promise<string> {
        if (!context.additionalContext?.chatHistory?.length) {
            return 'No previous conversation history.';
        }

        return context.additionalContext.chatHistory
            .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
            .join('\n\n');
    }

    private async resolveUserInput(context: PromptContext): Promise<string> {
        if (!context.scenebeat?.trim()) {
            return 'No specific question or topic provided.';
        }
        return context.scenebeat;
    }

    private async resolveBrainstormContext(context: PromptContext): Promise<string> {
        // Import the stores
        const lorebookStore = useLorebookStore.getState();
        const chapterStore = useChapterStore.getState();

        // Load entries if they're not already loaded
        if (lorebookStore.entries.length === 0) {
            await lorebookStore.loadEntries(context.storyId);
        }

        console.log('Resolving brainstorm context with additionalContext:', context.additionalContext);

        // Check if we need to include chapter summaries
        let chapterSummary = '';
        if (context.additionalContext?.selectedSummary) {
            const selectedSummary = context.additionalContext.selectedSummary;

            if (selectedSummary === 'all') {
                // Get all chapter summaries
                chapterSummary = await chapterStore.getAllChapterSummaries(context.storyId);
                console.log('Including all chapter summaries');
            } else if (selectedSummary !== 'none') {
                // Get a specific chapter summary
                chapterSummary = await chapterStore.getChapterSummary(selectedSummary);
                console.log(`Including summary for chapter with ID: ${selectedSummary}`);
            }
        }

        // Get matched entries from the context
        let entries: LorebookEntry[] = [];

        // Check if we have specifically selected lorebook items
        if (context.additionalContext?.selectedItems && context.additionalContext.selectedItems.length > 0) {
            console.log('Using specifically selected lorebook items:', context.additionalContext.selectedItems.length);
            const selectedItemIds = context.additionalContext.selectedItems as string[];
            entries = lorebookStore.entries.filter(entry => selectedItemIds.includes(entry.id));
        }
        // Check if we have matched entries directly in the context
        else if (context.matchedEntries && context.matchedEntries.size > 0) {
            console.log('Using matched entries from context:', context.matchedEntries.size);
            entries = Array.from(context.matchedEntries);
        }
        // If not, check if we have chapter matched entries
        else if (context.chapterMatchedEntries && context.chapterMatchedEntries.size > 0) {
            console.log('Using chapter matched entries:', context.chapterMatchedEntries.size);
            entries = Array.from(context.chapterMatchedEntries);
        }
        // If not, check if we have scene beat matched entries
        else if (context.sceneBeatMatchedEntries && context.sceneBeatMatchedEntries.size > 0) {
            console.log('Using scene beat matched entries:', context.sceneBeatMatchedEntries.size);
            entries = Array.from(context.sceneBeatMatchedEntries);
        }
        // If nothing direct, check the additional context
        else if (context.additionalContext) {
            // Check for full context flag
            if (context.additionalContext.includeFullContext) {
                console.log('Using full context (all entries)');
                entries = lorebookStore.entries;
            }
            // Check for selected tags
            else if (context.additionalContext.selectedTags?.length) {
                console.log('Using selected tags:', context.additionalContext.selectedTags);
                entries = context.additionalContext.selectedTags.flatMap(tag =>
                    lorebookStore.getEntriesByTag(tag)
                );
            }
            // Check for selected categories
            else if (context.additionalContext.selectedCategories !== undefined) {
                // If selectedCategories is an empty array, it means all categories are unselected
                if (context.additionalContext.selectedCategories.length === 0) {
                    console.log('All categories are unselected');
                    // We'll still return chapter summaries if selected
                    if (chapterSummary) {
                        console.log('Returning only chapter summaries');
                        return `Story Chapter Summaries:\n${chapterSummary}`;
                    }
                    return "No story context is available for this query. Feel free to ask about anything related to writing or storytelling in general.";
                } else {
                    console.log('Using selected categories:', context.additionalContext.selectedCategories);
                    entries = context.additionalContext.selectedCategories.flatMap(category =>
                        lorebookStore.getEntriesByCategory(category as any)
                    );
                    console.log('Found entries from categories:', entries.length);
                }
            } else {
                console.log('No context criteria matched in additionalContext');
            }
        }

        // If we still have no entries, use a fallback approach
        if (entries.length === 0) {
            // Only use fallback if we didn't explicitly unselect all categories
            if (!context.additionalContext?.selectedCategories || context.additionalContext.selectedCategories.length > 0) {
                console.log("No entries found, using fallback to get major characters");
                // Get major characters as a fallback
                entries = lorebookStore.getEntriesByImportance('major');
            } else {
                console.log("No entries found, but all categories were unselected, so not using fallback");
            }
        }

        // Log what we found for debugging
        console.log(`Resolved brainstorm context with ${entries.length} entries and ${chapterSummary ? 'with' : 'without'} chapter summaries`);

        // Format the entries and combine with chapter summaries
        if (entries.length === 0 && !chapterSummary) {
            return "No story context is available for this query. Feel free to ask about anything related to writing or storytelling in general.";
        }

        let result = '';

        // Add chapter summaries if available
        if (chapterSummary) {
            result += `Story Chapter Summaries:\n${chapterSummary}\n\n`;
        }

        // Add lorebook entries if available
        if (entries.length > 0) {
            if (chapterSummary) {
                result += "Story World Information:\n";
            }
            result += this.formatLorebookEntries(entries);
        }

        return result;
    }

    private async resolveAllCharacters(context: PromptContext): Promise<string> {
        const { getAllCharacters } = useLorebookStore.getState();
        return this.formatLorebookEntries(getAllCharacters());
    }

    private async resolveAllLocations(context: PromptContext): Promise<string> {
        const { getAllLocations } = useLorebookStore.getState();
        return this.formatLorebookEntries(getAllLocations());
    }

    private async resolveAllItems(context: PromptContext): Promise<string> {
        const { getAllItems } = useLorebookStore.getState();
        return this.formatLorebookEntries(getAllItems());
    }

    private async resolveAllEvents(context: PromptContext): Promise<string> {
        const { getAllEvents } = useLorebookStore.getState();
        return this.formatLorebookEntries(getAllEvents());
    }

    private async resolveAllNotes(context: PromptContext): Promise<string> {
        const { getAllNotes } = useLorebookStore.getState();
        return this.formatLorebookEntries(getAllNotes());
    }
}

export const createPromptParser = () => new PromptParser(db); 