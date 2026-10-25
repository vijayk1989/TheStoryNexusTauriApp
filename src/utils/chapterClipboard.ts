import { $generateHtmlFromNodes } from '@lexical/html';
import { ListItemNode, ListNode } from '@lexical/list';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { createEditor, type SerializedEditorState, type SerializedLexicalNode } from 'lexical';
import { AssetImageNode } from '@/components/editor/mainLexicalEditor/nodes/AssetImageNode';
import { lexicalToPlainText } from '@/components/editor/mainLexicalEditor/serialization/lexicalToPlainText';
import { normalizeChapterContent } from '@/features/chapters/utils/emptyChapterContent';
import { getChapterContentForReading } from '@/features/editor/utils/editorDraftContent';
import { getAssetIdFromReference, isAssetReference } from '@/features/images/services/assetStorage';
import { db } from '@/services/database';

type ManuscriptNode = SerializedLexicalNode & {
    children?: ManuscriptNode[];
    disabled?: boolean;
};

function manuscriptNodes(nodes: ManuscriptNode[]): ManuscriptNode[] {
    return nodes.flatMap((node) => {
        if (node.disabled || node.type === 'scene-beat' || node.type === 'image-generation') return [];
        const children = node.children ? manuscriptNodes(node.children) : undefined;
        if (node.type === 'generated-prose') return children ?? [];
        return [{ ...node, ...(children ? { children } : {}) }];
    });
}

async function getChapterClipboardContent(chapterId: string) {
    const chapter = await db.chapters.get(chapterId);
    if (!chapter) throw new Error('Chapter not found');

    const state: SerializedEditorState<ManuscriptNode> = JSON.parse(normalizeChapterContent(getChapterContentForReading(chapter)));
    state.root.children = manuscriptNodes(state.root.children);
    const editor = createEditor({
        nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, AssetImageNode],
        onError: (error) => { throw error; },
    });
    const html = editor.parseEditorState(state).read(() => $generateHtmlFromNodes(editor));
    const container = document.createElement('div');
    container.innerHTML = html;
    // Embed local images so pasted content can be read outside this app.
    await Promise.all(Array.from(container.querySelectorAll('img')).map(async (image) => {
        const src = image.getAttribute('src') ?? '';
        if (!isAssetReference(src)) return;
        const asset = await db.mediaBlobs.get(getAssetIdFromReference(src));
        if (!asset) throw new Error('Image asset bytes not found');
        image.src = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(asset.blob);
        });
    }));
    return { html: container.innerHTML, text: lexicalToPlainText(state) };
}

export async function copyChapterToClipboard(chapterId: string): Promise<void> {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
        throw new Error('Rich text clipboard is unavailable');
    }
    const content = getChapterClipboardContent(chapterId);
    // Start the write during the menu click while chapter data is loaded asynchronously.
    await navigator.clipboard.write([new ClipboardItem({
        'text/html': content.then(({ html }) => new Blob([html], { type: 'text/html' })),
        'text/plain': content.then(({ text }) => new Blob([text], { type: 'text/plain' })),
    })]);
}
