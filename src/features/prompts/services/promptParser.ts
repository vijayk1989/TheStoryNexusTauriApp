import { StoryDatabase, db } from '@/services/database';
import {
    LorebookEntry,
    PromptMessage,
    PromptParserConfig,
    ParsedPrompt,
    PromptContext,
    VariableResolver,
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
            'scenebeat_context': this.resolveSceneBeatContext.bind(this),
            'all_characters': this.resolveAllCharacters.bind(this),
            'all_locations': this.resolveAllLocations.bind(this),
            'all_items': this.resolveAllItems.bind(this),
            'all_events': this.resolveAllEvents.bind(this),
            'all_notes': this.resolveAllNotes.bind(this),
            'all_synopsis': this.resolveAllSynopsis.bind(this),
            'all_starting_scenarios': this.resolveAllStartingScenarios.bind(this),
            'all_timelines': this.resolveAllTimelines.bind(this),
            'chapter_outline': this.resolveChapterOutline.bind(this),
            'chapter_data': this.resolveChapterData.bind(this),
        };
    }

    async parse(config: PromptParserConfig): Promise<ParsedPrompt> {
        try {

            const prompt = await this.database.prompts.get(config.promptId);
            if (!prompt) throw new Error('Prompt not found');

            const context = await this.buildContext(config);
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

        // Handle function-style variables first
        const functionRegex = /\{\{(\w+)\((.*?)\)\}\}/g;
        const matches = Array.from(parsedContent.matchAll(functionRegex));

        for (const match of matches) {
            const [fullMatch, func, args] = match;
            if (func === 'previous_words') {
                const resolved = await this.resolvePreviousWords(context, args.trim());
                parsedContent = parsedContent.replace(fullMatch, resolved);
            }
            if (func === 'chapter_data') {
                const resolved = await this.resolveChapterData(args.trim());
                parsedContent = parsedContent.replace(fullMatch, resolved);
            }
        }

        // Special handling for combined lorebook entries
        // Check if both matched_entries_chapter and additional_scenebeat_context are present
        if (parsedContent.includes('{{matched_entries_chapter}}') &&
            parsedContent.includes('{{additional_scenebeat_context}}')) {

            // Get the matched entries
            let matchedEntries = '';
            if (context.chapterMatchedEntries && context.chapterMatchedEntries.size > 0) {
                const entries = Array.from(context.chapterMatchedEntries);
                entries.sort((a, b) => {
                    const importanceOrder = { 'major': 0, 'minor': 1, 'background': 2 };
                    const aImportance = a.metadata?.importance || 'background';
                    const bImportance = b.metadata?.importance || 'background';
                    return importanceOrder[aImportance] - importanceOrder[bImportance];
                });
                matchedEntries = this.formatLorebookEntries(entries);
            }

            // Get the additional context
            let additionalContext = '';
            if (context.additionalContext?.selectedItems && context.additionalContext.selectedItems.length > 0) {
                const selectedItemIds = context.additionalContext.selectedItems as string[];
                const lorebookStore = useLorebookStore.getState();
                const entries = lorebookStore.entries.filter(entry => selectedItemIds.includes(entry.id));

                // Create a set of entry IDs that are already included in matched entries
                const existingEntryIds = new Set<string>();

                // Add chapter matched entries
                if (context.chapterMatchedEntries) {
                    Array.from(context.chapterMatchedEntries.values()).forEach(entry => {
                        existingEntryIds.add(entry.id);
                    });
                }

                // Filter out entries that are already included in matched entries
                const uniqueEntries = entries.filter(entry => !existingEntryIds.has(entry.id));

                if (uniqueEntries.length > 0) {
                    additionalContext = this.formatLorebookEntries(uniqueEntries);
                }
            }

            // Combine the results
            let combinedResult = '';
            if (matchedEntries && additionalContext) {
                combinedResult = matchedEntries + '\n\n' + additionalContext;
            } else if (matchedEntries) {
                combinedResult = matchedEntries;
            } else if (additionalContext) {
                combinedResult = additionalContext;
            }

            // Replace both variables with the combined result
            parsedContent = parsedContent.replace(/\{\{matched_entries_chapter\}\}[\s\n]*\{\{[\s\n]*additional_scenebeat_context[\s\n]*\}\}/g, combinedResult);
            parsedContent = parsedContent.replace(/\{\{[\s\n]*additional_scenebeat_context[\s\n]*\}\}[\s\n]*\{\{matched_entries_chapter\}\}/g, combinedResult);

            // Remove the individual variables if they still exist
            parsedContent = parsedContent.replace(/\{\{matched_entries_chapter\}\}/g, '');
            parsedContent = parsedContent.replace(/\{\{[\s\n]*additional_scenebeat_context[\s\n]*\}\}/g, '');
        } else {
            // Handle regular variables
            parsedContent = await this.parseRegularVariables(parsedContent, context);
        }

        // Clean up any extra whitespace from comment removal
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

            // Handle all_* queries
            if (varName.startsWith('all_') && this.variableResolvers[varName]) {
                const resolved = await this.variableResolvers[varName](context);
                result = result.replace(fullMatch, resolved);
                continue;
            }

            // Handle character queries
            if (varName === 'character' && params.length > 0) {
                const characterName = params.join(' ');
                const resolved = await this.resolveCharacter(characterName, context);
                result = result.replace(fullMatch, resolved);
                continue;
            }

            // Handle other variables
            if (this.variableResolvers[varName]) {
                try {
                    const resolved = await this.variableResolvers[varName](context, ...params);
                    result = result.replace(fullMatch, resolved || '');
                } catch (error) {
                    console.error(`Error resolving variable ${varName}:`, error);
                    result = result.replace(fullMatch, `[Error: ${error.message}]`);
                }
            } else {
                console.warn(`Unknown variable: ${varName}`);
                result = result.replace(fullMatch, `[Unknown variable: ${varName}]`);
            }
        }

        return result;
    }

    private async resolveLorebookSceneBeatEntries(context: PromptContext): Promise<string> {

        if (!context.sceneBeatMatchedEntries || context.sceneBeatMatchedEntries.size === 0) {
            return '';
        }

        // Filter out disabled entries
        const entries = Array.from(context.sceneBeatMatchedEntries)
            .filter(entry => !entry.isDisabled);

        if (entries.length === 0) {
            return '';
        }

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
        // Parse the count parameter - default to 1000 if not a valid number
        const requestedWordCount = parseInt(count, 10) || 1000;

        // Start with current context's previous words
        let result = '';
        let currentWordCount = 0;

        if (context.previousWords) {
            // Preserve newlines by replacing them with a special token
            const newlineToken = '§NEWLINE§';
            const textWithTokens = context.previousWords.replace(/\n/g, newlineToken);

            // Split into words and count them
            const words = textWithTokens.split(/\s+/);
            currentWordCount = words.length;

            // If we have enough words, just return the last N words
            if (currentWordCount >= requestedWordCount) {
                const selectedWords = words.slice(-requestedWordCount);
                result = selectedWords.join(' ').replace(new RegExp(newlineToken, 'g'), '\n');
                return result;
            }

            // Otherwise, use what we have so far
            result = context.previousWords;
        }

        // If we don't have enough words and have chapter context, try to get content from previous chapter
        if (currentWordCount < requestedWordCount && context.currentChapter) {
            try {
                // Get the current chapter's POV settings
                const currentPovType = context.povType || context.currentChapter.povType;
                const currentPovCharacter = context.povCharacter || context.currentChapter.povCharacter;

                // Use our new helper method to get the previous chapter directly
                const chapterStore = useChapterStore.getState();
                const previousChapter = await chapterStore.getPreviousChapter(context.currentChapter.id);

                if (previousChapter) {
                    // Check if POV settings match
                    const prevPovType = previousChapter.povType;
                    const prevPovCharacter = previousChapter.povCharacter;

                    const povMatches =
                        // If both are omniscient, they match
                        (currentPovType === 'Third Person Omniscient' && prevPovType === 'Third Person Omniscient') ||
                        // If both are the same type and have the same character
                        (currentPovType === prevPovType && currentPovCharacter === prevPovCharacter);

                    if (povMatches) {
                        // Get the plain text content of the previous chapter
                        const previousContent = await chapterStore.getChapterPlainText(previousChapter.id);

                        if (previousContent) {
                            // Calculate how many more words we need
                            const wordsNeeded = requestedWordCount - currentWordCount;

                            // Get the last N words from the previous chapter
                            const newlineToken = '§NEWLINE§';
                            const textWithTokens = previousContent.replace(/\n/g, newlineToken);
                            const prevWords = textWithTokens.split(/\s+/);

                            // Take only what we need from the end of the previous chapter
                            const wordsToTake = Math.min(wordsNeeded, prevWords.length);
                            const selectedPrevWords = prevWords.slice(-wordsToTake);

                            // Combine previous chapter content with current content
                            if (selectedPrevWords.length > 0) {
                                const prevContent = selectedPrevWords.join(' ').replace(new RegExp(newlineToken, 'g'), '\n');

                                // Add a separator to indicate content from previous chapter
                                result = prevContent + '\n\n[...]\n\n' + result;

                                console.log(`Added ${selectedPrevWords.length} words from previous chapter to context`);
                            }
                        }
                    } else {
                        console.log('Previous chapter POV does not match current chapter POV, skipping');
                    }
                } else {
                    console.log('No previous chapter found');
                }
            } catch (error) {
                console.error('Error fetching previous chapter content:', error);
            }
        }

        return result;
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
        // Use the store instead of directly accessing the database
        const { getFilteredEntries } = useLorebookStore.getState();

        // Get filtered entries (already excludes disabled entries)
        const entries = getFilteredEntries()
            .filter(entry =>
                entry.storyId === context.storyId &&
                entry.category === 'character' &&
                entry.name.toLowerCase() === name.toLowerCase()
            );

        const matchedEntry = entries[0]; // Get the first matching entry if any

        return matchedEntry ? this.formatLorebookEntries([matchedEntry]) : '';
    }

    private async resolveMatchedEntriesChapter(context: PromptContext): Promise<string> {

        if (!context.chapterMatchedEntries || context.chapterMatchedEntries.size === 0) {
            return '';
        }

        // Filter out disabled entries
        const entries = Array.from(context.chapterMatchedEntries)
            .filter(entry => !entry.isDisabled);

        if (entries.length === 0) {
            return '';
        }

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
            return context.additionalContext.plainTextContent;
        }

        console.warn('No plain text content found for chapter:', context.currentChapter.id);
        return '';
    }

    private async resolveSelectedText(context: PromptContext): Promise<string> {

        if (!context.additionalContext?.selectedText) {
            return '';
        }

        return context.additionalContext.selectedText;
    }

    private async resolveStoryLanguage(context: PromptContext): Promise<string> {
        return context.storyLanguage || 'English';
    }

    private async resolveAllEntries(context: PromptContext, category?: string): Promise<string> {
        // Use the store instead of directly accessing the database
        const { getFilteredEntries } = useLorebookStore.getState();

        // Get filtered entries (already excludes disabled entries)
        let entries = getFilteredEntries();

        // Filter by storyId
        entries = entries.filter(entry => entry.storyId === context.storyId);

        // Filter by category if provided
        if (category) {
            entries = entries.filter(entry => entry.category === category);
        }

        return this.formatLorebookEntries(entries);
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

        // Add debug log for the entire context
        console.log('DEBUG: brainstormContext additionalContext:', context.additionalContext);

        // Load entries if they're not already loaded
        if (lorebookStore.entries.length === 0) {
            await lorebookStore.loadEntries(context.storyId);
        }

        // Check if full context is enabled
        if (context.additionalContext?.includeFullContext === true) {
            // Get all chapter summaries
            const chapterSummary = await chapterStore.getAllChapterSummaries(context.storyId);

            // Get all lorebook entries
            const entries = lorebookStore.getAllEntries();

            // Format the result
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

        // Check if we need to include chapter summaries
        let chapterSummary = '';
        if (context.additionalContext?.selectedSummaries && context.additionalContext.selectedSummaries.length > 0) {
            const selectedSummaries = context.additionalContext.selectedSummaries as string[];

            if (selectedSummaries.includes('all')) {
                // Get all chapter summaries
                chapterSummary = await chapterStore.getAllChapterSummaries(context.storyId);
            } else {
                // Get specific chapter summaries
                const summaries = await Promise.all(
                    selectedSummaries.map(id => chapterStore.getChapterSummary(id))
                );
                chapterSummary = summaries.filter(Boolean).join('\n\n');
            }
        }

        // Get matched entries from the context
        let entries: LorebookEntry[] = [];

        // Check if we have specifically selected lorebook items
        if (context.additionalContext?.selectedItems && context.additionalContext.selectedItems.length > 0) {
            const selectedItemIds = context.additionalContext.selectedItems as string[];
            entries = lorebookStore.entries.filter(entry => selectedItemIds.includes(entry.id));
        }

        // Format the entries and combine with chapter summaries
        if (entries.length === 0 && !chapterSummary && !context.additionalContext?.selectedChapterContent?.length) {
            return "No story context is available for this query. Feel free to ask about anything related to writing or storytelling in general.";
        }

        let result = '';

        // Handle chapter summaries
        if (context.additionalContext?.selectedSummaries?.length > 0) {
            const summaries = await Promise.all(
                context.additionalContext.selectedSummaries.map(id =>
                    chapterStore.getChapterSummary(id)
                )
            );
            const summaryText = summaries.filter(Boolean).join('\n\n');
            if (summaryText) {
                result += `Story Chapter Summaries:\n${summaryText}\n\n`;
            }
        }

        // Handle chapter content
        if (context.additionalContext?.selectedChapterContent?.length > 0) {
            console.log('DEBUG: Processing selectedChapterContent:', context.additionalContext.selectedChapterContent);

            try {
                const contents = await Promise.all(
                    context.additionalContext.selectedChapterContent.map(async id => {
                        console.log(`DEBUG: Fetching content for chapter ID: ${id}`);
                        try {
                            const chapter = await db.chapters.get(id);
                            console.log(`DEBUG: Chapter fetch result:`, chapter ? `Found chapter ${chapter.order}` : 'Not found');

                            if (!chapter) return '';

                            console.log(`DEBUG: Getting plain text for chapter ${chapter.order}`);
                            const content = await chapterStore.getChapterPlainText(id);
                            console.log(`DEBUG: Content length for chapter ${chapter.order}: ${content ? content.length : 0} chars`);

                            return `Chapter ${chapter.order} Content:\n${content}`;
                        } catch (err) {
                            console.error(`DEBUG: Error processing chapter ${id}:`, err);
                            return '';
                        }
                    })
                );

                console.log(`DEBUG: Contents array:`, contents);
                const contentText = contents.filter(Boolean).join('\n\n');
                console.log(`DEBUG: Final chapter content text:`, contentText.substring(0, 100) + '...');

                if (contentText) {
                    result += `Full Chapter Content:\n${contentText}\n\n`;
                    console.log('DEBUG: Added chapter content to result');
                } else {
                    console.log('DEBUG: No chapter content was added (empty content)');
                }
            } catch (err) {
                console.error('DEBUG: Error in chapter content processing:', err);
            }
        } else {
            console.log('DEBUG: No selectedChapterContent found or empty array');
        }

        // Handle lorebook entries
        if (context.additionalContext?.selectedItems?.length > 0) {
            const selectedItemIds = context.additionalContext.selectedItems;
            entries = lorebookStore.entries.filter(entry =>
                selectedItemIds.includes(entry.id)
            );
            if (entries.length > 0) {
                result += "Story World Information:\n";
                result += this.formatLorebookEntries(entries);
            }
        }

        return result || "No story context is available for this query. Feel free to ask about anything related to writing or storytelling in general.";
    }

    private async resolveAllCharacters(context: PromptContext): Promise<string> {
        const { getAllCharacters } = useLorebookStore.getState();
        // getAllCharacters already filters out disabled entries
        return this.formatLorebookEntries(getAllCharacters());
    }

    private async resolveAllLocations(context: PromptContext): Promise<string> {
        const { getAllLocations } = useLorebookStore.getState();
        // getAllLocations already filters out disabled entries
        return this.formatLorebookEntries(getAllLocations());
    }

    private async resolveAllItems(context: PromptContext): Promise<string> {
        const { getAllItems } = useLorebookStore.getState();
        // getAllItems already filters out disabled entries
        return this.formatLorebookEntries(getAllItems());
    }

    private async resolveAllEvents(context: PromptContext): Promise<string> {
        const { getAllEvents } = useLorebookStore.getState();
        // getAllEvents already filters out disabled entries
        return this.formatLorebookEntries(getAllEvents());
    }

    private async resolveAllNotes(context: PromptContext): Promise<string> {
        const { getAllNotes } = useLorebookStore.getState();
        // getAllNotes already filters out disabled entries
        return this.formatLorebookEntries(getAllNotes());
    }

    private async resolveAllSynopsis(context: PromptContext): Promise<string> {
        const { getAllSynopsis } = useLorebookStore.getState();
        // getAllSynopsis already filters out disabled entries
        return this.formatLorebookEntries(getAllSynopsis());
    }

    private async resolveAllStartingScenarios(context: PromptContext): Promise<string> {
        const { getAllStartingScenarios } = useLorebookStore.getState();
        // getAllStartingScenarios already filters out disabled entries
        return this.formatLorebookEntries(getAllStartingScenarios());
    }

    private async resolveAllTimelines(context: PromptContext): Promise<string> {
        const { getAllTimelines } = useLorebookStore.getState();
        // getAllTimelines already filters out disabled entries
        return this.formatLorebookEntries(getAllTimelines());
    }

    private async resolveSceneBeatContext(context: PromptContext): Promise<string> {
        // Create a map to store unique entries by ID
        const uniqueEntries = new Map<string, LorebookEntry>();

        // If we have sceneBeatContext, use it to determine which entries to include
        if (context.sceneBeatContext) {
            const { useMatchedChapter, useMatchedSceneBeat, useCustomContext, customContextItems } = context.sceneBeatContext;

            // Include matched chapter entries if the toggle is enabled
            if (useMatchedChapter && context.chapterMatchedEntries && context.chapterMatchedEntries.size > 0) {
                context.chapterMatchedEntries.forEach(entry => {
                    uniqueEntries.set(entry.id, entry);
                });
            }

            // Include matched scene beat entries if the toggle is enabled
            if (useMatchedSceneBeat && context.sceneBeatMatchedEntries && context.sceneBeatMatchedEntries.size > 0) {
                context.sceneBeatMatchedEntries.forEach(entry => {
                    uniqueEntries.set(entry.id, entry);
                });
            }

            // Include custom context items if the toggle is enabled
            if (useCustomContext && customContextItems && customContextItems.length > 0) {
                // Load entries if they're not already loaded
                const lorebookStore = useLorebookStore.getState();
                if (lorebookStore.entries.length === 0 && context.storyId) {
                    await lorebookStore.loadEntries(context.storyId);
                }

                // Get the custom entries from the store
                const customEntries = lorebookStore.entries.filter(entry =>
                    customContextItems.includes(entry.id)
                );

                // Add the custom entries to the unique entries map
                customEntries.forEach(entry => {
                    uniqueEntries.set(entry.id, entry);
                });
            }
        }
        // For backward compatibility, if no sceneBeatContext is provided but we have matched entries
        else if (context.matchedEntries && context.matchedEntries.size > 0) {
            context.matchedEntries.forEach(entry => {
                uniqueEntries.set(entry.id, entry);
            });
        }

        // Convert the map to an array and sort by importance
        const sortedEntries = Array.from(uniqueEntries.values()).sort(
            (a, b) => {
                const importanceOrder = { 'major': 3, 'minor': 2, 'background': 1 };
                const aImportance = a.metadata?.importance || 'background';
                const bImportance = b.metadata?.importance || 'background';
                return importanceOrder[bImportance] - importanceOrder[aImportance];
            }
        );

        // If we have no entries, return an empty string
        if (sortedEntries.length === 0) {
            return 'No lorebook entries are available for this prompt.';
        }

        // Use the standard formatLorebookEntries method for consistency
        return this.formatLorebookEntries(sortedEntries);
    }

    private async resolveChapterOutline(context: PromptContext): Promise<string> {
        const { getChapterOutline } = useChapterStore.getState();
        const outline = await getChapterOutline(context.currentChapter?.id);
        return outline ? outline.content : 'No chapter outline is available for this prompt.';
    }

    private async resolveChapterData(args: string): Promise<string> {
        const chapterOrder = parseInt(args);
        const { getChapterPlainTextByChapterOrder } = useChapterStore.getState();
        const data = await getChapterPlainTextByChapterOrder(chapterOrder);
        return data ? data : 'No chapter data is available for this prompt.';
    }
}

export const createPromptParser = () => new PromptParser(db); 