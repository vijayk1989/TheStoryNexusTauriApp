import { create } from 'zustand';
import { db } from '@/services/database';
import { $getRoot, LexicalEditor } from 'lexical';

interface ChapterContentState {
    // Content processing operations
    getChapterPlainText: (id: string) => Promise<string>;
    getChapterPlainTextByChapterOrder: (chapterOrder: number) => Promise<string>;
    extractPlainTextFromLexicalState: (editorStateJSON: string) => string;
}

export const useChapterContentStore = create<ChapterContentState>(() => ({
    getChapterPlainText: async (id: string) => {
        try {
            const chapter = await db.chapters.get(id);
            if (!chapter || !chapter.content) {
                console.log('Chapter not found or has no content');
                return '';
            }

            const plainText = useChapterContentStore.getState().extractPlainTextFromLexicalState(chapter.content);
            return plainText;
        } catch (error) {
            console.error('Error getting chapter plain text:', error);
            return '';
        }
    },

    getChapterPlainTextByChapterOrder: async (chapterOrder: number) => {
        try {
            const chapters = await db.chapters.toArray();
            const chapter = chapters.find(ch => ch.order === chapterOrder);

            if (!chapter || !chapter.content) {
                console.log('Chapter not found or has no content for order:', chapterOrder);
                return '';
            }

            const plainText = useChapterContentStore.getState().extractPlainTextFromLexicalState(chapter.content);
            return plainText;
        } catch (error) {
            console.error('Error getting chapter plain text by order:', error);
            return '';
        }
    },

    extractPlainTextFromLexicalState: (editorStateJSON: string) => {
        try {
            const editorState = JSON.parse(editorStateJSON);

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

                let text = '';

                if (node.children && Array.isArray(node.children)) {
                    for (const child of node.children) {
                        text += extractText(child);
                    }
                }

                if (node.type === 'paragraph' || node.type === 'heading') {
                    text += '\n';
                }

                return text;
            };

            const rootNode = editorState.root;
            let plainText = extractText(rootNode);

            plainText = plainText
                .replace(/\n{3,}/g, '\n\n')
                .trim();

            return plainText;
        } catch (error) {
            console.error('Error extracting plain text from Lexical state:', error);
            return '';
        }
    }
}));
