import { PromptContext } from '@/types/story';
import { useLorebookStore } from '@/features/lorebook/stores/useLorebookStore';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';
import { db } from '@/services/database';
import { IVariableResolver, ILorebookFormatter } from './types';

export class ChatHistoryResolver implements IVariableResolver {
    async resolve(context: PromptContext): Promise<string> {
        if (!context.additionalContext?.chatHistory?.length) {
            return 'No previous conversation history.';
        }

        return context.additionalContext.chatHistory
            .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
            .join('\n\n');
    }
}

export class UserInputResolver implements IVariableResolver {
    async resolve(context: PromptContext): Promise<string> {
        if (!context.scenebeat?.trim()) {
            return 'No specific question or topic provided.';
        }
        return context.scenebeat;
    }
}

export class BrainstormContextResolver implements IVariableResolver {
    constructor(private formatter: ILorebookFormatter) {}

    async resolve(context: PromptContext): Promise<string> {
        const lorebookStore = useLorebookStore.getState();
        const chapterStore = useChapterStore.getState();

        console.log('DEBUG: brainstormContext additionalContext:', context.additionalContext);

        if (lorebookStore.entries.length === 0) {
            await lorebookStore.loadEntries(context.storyId);
        }

        if (context.additionalContext?.includeFullContext === true) {
            const chapterSummary = await chapterStore.getAllChapterSummaries(context.storyId);
            const entries = lorebookStore.getAllEntries();

            let result = '';

            if (chapterSummary) {
                result += `Story Chapter Summaries:\n${chapterSummary}\n\n`;
            }

            if (entries.length > 0) {
                if (chapterSummary) {
                    result += "Story World Information:\n";
                }
                result += this.formatter.formatEntries(entries);
            }

            return result;
        }

        let chapterSummary = '';
        if (context.additionalContext?.selectedSummaries && context.additionalContext.selectedSummaries.length > 0) {
            const selectedSummaries = context.additionalContext.selectedSummaries as string[];

            if (selectedSummaries.includes('all')) {
                chapterSummary = await chapterStore.getAllChapterSummaries(context.storyId);
            } else {
                const summaries = await Promise.all(
                    selectedSummaries.map(id => chapterStore.getChapterSummary(id))
                );
                chapterSummary = summaries.filter(Boolean).join('\n\n');
            }
        }

        let entries = [];

        if (context.additionalContext?.selectedItems && context.additionalContext.selectedItems.length > 0) {
            const selectedItemIds = context.additionalContext.selectedItems as string[];
            entries = lorebookStore.entries.filter(entry => selectedItemIds.includes(entry.id));
        }

        if (entries.length === 0 && !chapterSummary && !context.additionalContext?.selectedChapterContent?.length) {
            return "No story context is available for this query. Feel free to ask about anything related to writing or storytelling in general.";
        }

        let result = '';

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

        if (context.additionalContext?.selectedItems?.length > 0) {
            const selectedItemIds = context.additionalContext.selectedItems;
            entries = lorebookStore.entries.filter(entry =>
                selectedItemIds.includes(entry.id)
            );
            if (entries.length > 0) {
                result += "Story World Information:\n";
                result += this.formatter.formatEntries(entries);
            }
        }

        return result || "No story context is available for this query. Feel free to ask about anything related to writing or storytelling in general.";
    }
}
