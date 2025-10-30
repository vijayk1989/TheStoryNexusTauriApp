import { PromptContext } from '@/types/story';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';
import { IVariableResolver, ILorebookFormatter } from './types';
import { attemptPromise } from '@jfdi/attempt';

export class ChapterSummariesResolver implements IVariableResolver {
    async resolve(context: PromptContext): Promise<string> {
        if (!context.chapters) return '';

        const { getChapterSummaries } = useChapterStore.getState();

        if (context.currentChapter) {
            return await getChapterSummaries(context.storyId, context.currentChapter.order);
        } else {
            return await getChapterSummaries(context.storyId, Infinity, true);
        }
    }
}

export class PreviousWordsResolver implements IVariableResolver {
    async resolve(context: PromptContext, count: string = '1000'): Promise<string> {
        const requestedWordCount = parseInt(count, 10) || 1000;

        const { result: initialResult, wordCount } = this.getInitialWords(context, requestedWordCount);

        if (wordCount >= requestedWordCount || !context.currentChapter) {
            return initialResult;
        }

        return await this.augmentWithPreviousChapter(
            context,
            initialResult,
            wordCount,
            requestedWordCount
        );
    }

    private getInitialWords(context: PromptContext, requestedWordCount: number): { result: string; wordCount: number } {
        if (!context.previousWords) {
            return { result: '', wordCount: 0 };
        }

        const newlineToken = '§NEWLINE§';
        const textWithTokens = context.previousWords.replace(/\n/g, newlineToken);
        const words = textWithTokens.split(/\s+/);

        if (words.length >= requestedWordCount) {
            const selectedWords = words.slice(-requestedWordCount);
            const result = selectedWords.join(' ').replace(new RegExp(newlineToken, 'g'), '\n');
            return { result, wordCount: words.length };
        }

        return { result: context.previousWords, wordCount: words.length };
    }

    private async augmentWithPreviousChapter(
        context: PromptContext,
        currentResult: string,
        currentWordCount: number,
        requestedWordCount: number
    ): Promise<string> {
        if (!context.currentChapter) {
            return currentResult;
        }

        const currentPovType = context.povType || context.currentChapter.povType;
        const currentPovCharacter = context.povCharacter || context.currentChapter.povCharacter;

        const chapterStore = useChapterStore.getState();
        const [error, previousChapter] = await attemptPromise(() =>
            chapterStore.getPreviousChapter(context.currentChapter!.id)
        );

        if (error) {
            console.error('Error fetching previous chapter:', error);
            return currentResult;
        }

        if (!previousChapter) {
            console.log('No previous chapter found');
            return currentResult;
        }

        const povMatches =
            (currentPovType === 'Third Person Omniscient' && previousChapter.povType === 'Third Person Omniscient') ||
            (currentPovType === previousChapter.povType && currentPovCharacter === previousChapter.povCharacter);

        if (!povMatches) {
            console.log('Previous chapter POV does not match current chapter POV, skipping');
            return currentResult;
        }

        const [contentError, previousContent] = await attemptPromise(() =>
            chapterStore.getChapterPlainText(previousChapter.id)
        );

        if (contentError || !previousContent) {
            console.error('Error fetching previous chapter content:', contentError);
            return currentResult;
        }

        const wordsNeeded = requestedWordCount - currentWordCount;
        const newlineToken = '§NEWLINE§';
        const textWithTokens = previousContent.replace(/\n/g, newlineToken);
        const prevWords = textWithTokens.split(/\s+/);

        const wordsToTake = Math.min(wordsNeeded, prevWords.length);
        const selectedPrevWords = prevWords.slice(-wordsToTake);

        if (selectedPrevWords.length === 0) {
            return currentResult;
        }

        const prevContent = selectedPrevWords.join(' ').replace(new RegExp(newlineToken, 'g'), '\n');
        console.log(`Added ${selectedPrevWords.length} words from previous chapter to context`);
        return prevContent + '\n\n[...]\n\n' + currentResult;
    }
}

export class ChapterContentResolver implements IVariableResolver {
    async resolve(context: PromptContext): Promise<string> {
        if (!context.currentChapter) return '';

        const plainTextContent = context.additionalContext?.plainTextContent as string | undefined;
        if (plainTextContent) {
            return plainTextContent;
        }

        console.warn('No plain text content found for chapter:', context.currentChapter.id);
        return '';
    }
}

export class ChapterOutlineResolver implements IVariableResolver {
    async resolve(context: PromptContext): Promise<string> {
        const { getChapterOutline } = useChapterStore.getState();
        const outline = await getChapterOutline(context.currentChapter?.id);
        return outline ? outline.content : 'No chapter outline is available for this prompt.';
    }
}

export class ChapterDataResolver implements IVariableResolver {
    async resolve(context: PromptContext, args: string): Promise<string> {
        const chapterOrder = parseInt(args);
        const { getChapterPlainTextByChapterOrder } = useChapterStore.getState();
        const data = await getChapterPlainTextByChapterOrder(chapterOrder);
        return data ? data : 'No chapter data is available for this prompt.';
    }
}
