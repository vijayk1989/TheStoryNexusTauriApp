import { create } from 'zustand';
import { attemptPromise, attempt } from '@jfdi/attempt';
import { db } from '@/services/database';

interface ChapterContentState {
    // Content processing operations
    getChapterPlainText: (id: string) => Promise<string>;
    getChapterPlainTextByChapterOrder: (chapterOrder: number) => Promise<string>;
    extractPlainTextFromLexicalState: (editorStateJSON: string) => string;
}

export const useChapterContentStore = create<ChapterContentState>(() => ({
    getChapterPlainText: async (id: string): Promise<string> => {
        const [error, chapter] = await attemptPromise(() => db.chapters.get(id));

        if (error) {
            console.error('Error getting chapter plain text:', error);
            return '';
        }

        if (!chapter || !chapter.content) {
            console.log('Chapter not found or has no content');
            return '';
        }

        const plainText: string = useChapterContentStore.getState().extractPlainTextFromLexicalState(chapter.content);
        return plainText;
    },

    getChapterPlainTextByChapterOrder: async (chapterOrder: number) => {
        const [error, chapters] = await attemptPromise(() => db.chapters.toArray());

        if (error) {
            console.error('Error getting chapter plain text by order:', error);
            return '';
        }

        const chapter = chapters.find(ch => ch.order === chapterOrder);

        if (!chapter || !chapter.content) {
            console.log('Chapter not found or has no content for order:', chapterOrder);
            return '';
        }

        const plainText: string = useChapterContentStore.getState().extractPlainTextFromLexicalState(chapter.content);
        return plainText;
    },

    extractPlainTextFromLexicalState: (editorStateJSON: string) => {
        const [parseError, editorState] = attempt(() => JSON.parse(editorStateJSON));

        if (parseError) {
            console.error('Error extracting plain text from Lexical state:', parseError);
            return '';
        }

        const extractText = (node: any): string => {
            if (!node) return '';

            if (node.type === 'text') {
                return node.text || '';
            }

            if (node.type === 'linebreak') {
                return '\n';
            }

            if (node.type === 'scene-beat') {
                return '';
            }

            const childrenText = (node.children && Array.isArray(node.children))
                ? node.children.map(extractText).join('')
                : '';

            const lineBreak = (node.type === 'paragraph' || node.type === 'heading') ? '\n' : '';

            return childrenText + lineBreak;
        };

        const rootNode = editorState.root;
        const rawText = extractText(rootNode);

        return rawText
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
}));
