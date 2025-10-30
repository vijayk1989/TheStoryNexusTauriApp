import { PromptContext } from '@/types/story';
import { useLorebookStore } from '@/features/lorebook/stores/useLorebookStore';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';
import { db } from '@/services/database';
import { IVariableResolver, ILorebookFormatter } from './types';
import { attemptPromise } from '@jfdi/attempt';

export class ChatHistoryResolver implements IVariableResolver {
    async resolve(context: PromptContext): Promise<string> {
        const chatHistory = context.additionalContext?.chatHistory as Array<{ role: string; content: string }> | undefined;
        if (!chatHistory?.length) {
            return 'No previous conversation history.';
        }

        return chatHistory
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

            const parts = [
                chapterSummary ? `Story Chapter Summaries:\n${chapterSummary}` : '',
                entries.length > 0 ? (chapterSummary ? "Story World Information:\n" : '') + this.formatter.formatEntries(entries) : ''
            ];

            return parts.filter(Boolean).join('\n\n');
        }

        const summaries = await this.getSelectedSummaries(context, chapterStore);
        const chapterContent = await this.getSelectedChapterContent(context, chapterStore);
        const lorebookEntries = this.getSelectedLorebookEntries(context, lorebookStore);

        if (!summaries && !chapterContent && !lorebookEntries) {
            return "No story context is available for this query. Feel free to ask about anything related to writing or storytelling in general.";
        }

        const parts = [
            summaries ? `Story Chapter Summaries:\n${summaries}` : '',
            chapterContent ? `Full Chapter Content:\n${chapterContent}` : '',
            lorebookEntries ? `Story World Information:\n${lorebookEntries}` : ''
        ];

        return parts.filter(Boolean).join('\n\n') ||
            "No story context is available for this query. Feel free to ask about anything related to writing or storytelling in general.";
    }

    private async getSelectedSummaries(context: PromptContext, chapterStore: ReturnType<typeof useChapterStore.getState>): Promise<string> {
        const selectedSummaries = context.additionalContext?.selectedSummaries;
        if (!selectedSummaries || !Array.isArray(selectedSummaries) || selectedSummaries.length === 0) {
            return '';
        }

        if (selectedSummaries.includes('all')) {
            return await chapterStore.getAllChapterSummaries(context.storyId);
        }

        const summaries = await Promise.all(
            (selectedSummaries as string[]).map(id => chapterStore.getChapterSummary(id))
        );
        return summaries.filter(Boolean).join('\n\n');
    }

    private async getSelectedChapterContent(context: PromptContext, chapterStore: ReturnType<typeof useChapterStore.getState>): Promise<string> {
        const selectedContent = context.additionalContext?.selectedChapterContent;
        if (!selectedContent || !Array.isArray(selectedContent) || selectedContent.length === 0) {
            console.log('DEBUG: No selectedChapterContent found or empty array');
            return '';
        }

        console.log('DEBUG: Processing selectedChapterContent:', selectedContent);

        const [error, contents] = await attemptPromise(() =>
            Promise.all(
                (selectedContent as string[]).map(async id => {
                    console.log(`DEBUG: Fetching content for chapter ID: ${id}`);

                    const [chapterError, chapter] = await attemptPromise(() => db.chapters.get(id));

                    if (chapterError) {
                        console.error(`DEBUG: Error fetching chapter ${id}:`, chapterError);
                        return '';
                    }

                    console.log(`DEBUG: Chapter fetch result:`, chapter ? `Found chapter ${chapter.order}` : 'Not found');

                    if (!chapter) return '';

                    console.log(`DEBUG: Getting plain text for chapter ${chapter.order}`);
                    const [contentError, content] = await attemptPromise(() =>
                        chapterStore.getChapterPlainText(id)
                    );

                    if (contentError) {
                        console.error(`DEBUG: Error getting content for chapter ${id}:`, contentError);
                        return '';
                    }

                    console.log(`DEBUG: Content length for chapter ${chapter.order}: ${content ? content.length : 0} chars`);

                    return content ? `Chapter ${chapter.order} Content:\n${content}` : '';
                })
            )
        );

        if (error) {
            console.error('DEBUG: Error in chapter content processing:', error);
            return '';
        }

        const contentText = contents.filter(Boolean).join('\n\n');
        console.log(`DEBUG: Final chapter content text:`, contentText.substring(0, 100) + '...');

        if (contentText) {
            console.log('DEBUG: Added chapter content to result');
        } else {
            console.log('DEBUG: No chapter content was added (empty content)');
        }

        return contentText;
    }

    private getSelectedLorebookEntries(context: PromptContext, lorebookStore: ReturnType<typeof useLorebookStore.getState>): string {
        const selectedItems = context.additionalContext?.selectedItems;
        if (!selectedItems || !Array.isArray(selectedItems) || selectedItems.length === 0) {
            return '';
        }

        const selectedItemIds = selectedItems as string[];
        const entries = lorebookStore.entries.filter(entry => selectedItemIds.includes(entry.id));

        return entries.length > 0 ? this.formatter.formatEntries(entries) : '';
    }
}
