import { PromptContext } from '@/types/story';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';
import { IVariableResolver, ILorebookFormatter } from './types';

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

        let result = '';
        let currentWordCount = 0;

        if (context.previousWords) {
            const newlineToken = '§NEWLINE§';
            const textWithTokens = context.previousWords.replace(/\n/g, newlineToken);

            const words = textWithTokens.split(/\s+/);
            currentWordCount = words.length;

            if (currentWordCount >= requestedWordCount) {
                const selectedWords = words.slice(-requestedWordCount);
                result = selectedWords.join(' ').replace(new RegExp(newlineToken, 'g'), '\n');
                return result;
            }

            result = context.previousWords;
        }

        if (currentWordCount < requestedWordCount && context.currentChapter) {
            try {
                const currentPovType = context.povType || context.currentChapter.povType;
                const currentPovCharacter = context.povCharacter || context.currentChapter.povCharacter;

                const chapterStore = useChapterStore.getState();
                const previousChapter = await chapterStore.getPreviousChapter(context.currentChapter.id);

                if (previousChapter) {
                    const prevPovType = previousChapter.povType;
                    const prevPovCharacter = previousChapter.povCharacter;

                    const povMatches =
                        (currentPovType === 'Third Person Omniscient' && prevPovType === 'Third Person Omniscient') ||
                        (currentPovType === prevPovType && currentPovCharacter === prevPovCharacter);

                    if (povMatches) {
                        const previousContent = await chapterStore.getChapterPlainText(previousChapter.id);

                        if (previousContent) {
                            const wordsNeeded = requestedWordCount - currentWordCount;

                            const newlineToken = '§NEWLINE§';
                            const textWithTokens = previousContent.replace(/\n/g, newlineToken);
                            const prevWords = textWithTokens.split(/\s+/);

                            const wordsToTake = Math.min(wordsNeeded, prevWords.length);
                            const selectedPrevWords = prevWords.slice(-wordsToTake);

                            if (selectedPrevWords.length > 0) {
                                const prevContent = selectedPrevWords.join(' ').replace(new RegExp(newlineToken, 'g'), '\n');
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
}

export class ChapterContentResolver implements IVariableResolver {
    async resolve(context: PromptContext): Promise<string> {
        if (!context.currentChapter) return '';

        if (context.additionalContext?.plainTextContent) {
            return context.additionalContext.plainTextContent;
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
