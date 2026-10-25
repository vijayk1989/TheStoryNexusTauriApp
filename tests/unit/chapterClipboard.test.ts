import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { $createParagraphNode, $createTextNode, $getRoot, createEditor } from 'lexical';
import { $createHeadingNode, $createQuoteNode, HeadingNode, QuoteNode } from '@lexical/rich-text';
import { $createListItemNode, $createListNode, ListItemNode, ListNode } from '@lexical/list';
import { copyChapterToClipboard } from '@/utils/chapterClipboard';
import { db } from '@/services/database';
import { clearSavedEditorDraft, setEditorDraftContent } from '@/features/editor/utils/editorDraftContent';
import { resetTestDb } from './testDb';

let copied: Record<string, string>;
const write = vi.fn(async (items: Array<{ data: Record<string, Promise<Blob>> }>) => {
    const entries = await Promise.all(Object.entries(items[0].data).map(async ([type, blob]) => [type, await (await blob).text()]));
    copied = Object.fromEntries(entries);
});

beforeEach(async () => {
    await resetTestDb();
    copied = {};
    vi.stubGlobal('navigator', { clipboard: { write } });
    vi.stubGlobal('ClipboardItem', class {
        constructor(public data: Record<string, Promise<Blob>>) {}
    });
    const editor = createEditor({ nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode], onError: (error) => { throw error; } });
    editor.update(() => {
        $getRoot().append(
            $createHeadingNode('h2').append($createTextNode('Heading')),
            $createParagraphNode().append($createTextNode('Bold').toggleFormat('bold'), $createTextNode(' and '), $createTextNode('italic').toggleFormat('italic')),
            $createQuoteNode().append($createTextNode('Quoted text')),
            $createListNode('bullet').append($createListItemNode().append($createTextNode('List entry'))),
            $createParagraphNode().append($createTextNode('<script> is text & stays text')),
        );
    }, { discrete: true });
    await db.chapters.put({ id: 'chapter', storyId: 'story', title: 'Title', order: 1, content: JSON.stringify(editor.getEditorState().toJSON()), wordCount: 0, createdAt: new Date() });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

test('copies the entire chapter with rich formatting and a plain text alternative', async () => {
    await copyChapterToClipboard('chapter');
    const html = document.createElement('div');
    html.innerHTML = copied['text/html'];
    expect(html.querySelector('h2')?.textContent).toBe('Heading');
    expect(html.querySelector('b, strong')?.textContent).toBe('Bold');
    expect(html.querySelector('i, em')?.textContent).toBe('italic');
    expect(html.querySelector('blockquote')?.textContent).toBe('Quoted text');
    expect(html.querySelector('ul li')?.textContent).toBe('List entry');
    expect(html.querySelector('script')).toBeNull();
    expect(copied['text/plain']).toBe('Heading\nBold and italic\nQuoted text\nList entry\n<script> is text & stays text');
});

test('copies pending edits and accepted prose without disabled text, controls, or metadata', async () => {
    const state = JSON.parse((await db.chapters.get('chapter'))!.content);
    const paragraph = state.root.children[1];
    state.root.children = [
        { type: 'scene-beat', version: 1, command: 'Private instruction' },
        { type: 'image-generation', version: 1, prompt: 'Private image prompt' },
        { type: 'generated-prose', version: 1, generation: { promptName: 'Private label' }, children: [paragraph] },
        { type: 'generated-prose', version: 1, disabled: true, children: [state.root.children[0]] },
    ];
    const draft = JSON.stringify(state);
    setEditorDraftContent('chapter', draft);
    try {
        await copyChapterToClipboard('chapter');
        expect(copied['text/plain']).toBe('Bold and italic');
        expect(copied['text/html']).not.toMatch(/Private|Heading|generated-prose|scene-beat/);
    } finally {
        clearSavedEditorDraft('chapter', draft);
    }
});

test('embeds local chapter images for pasting outside the app', async () => {
    // Happy DOM blobs do not survive fake-indexeddb's native structured clone.
    vi.spyOn(db.mediaBlobs, 'get').mockResolvedValue({ assetId: 'image', blob: new Blob(['image bytes'], { type: 'image/png' }), createdAt: new Date() });
    const state = JSON.parse((await db.chapters.get('chapter'))!.content);
    state.root.children.push({ type: 'asset-image', version: 1, src: 'story-nexus-asset:image', altText: 'Chapter illustration', maxWidth: 800 });
    await db.chapters.update('chapter', { content: JSON.stringify(state) });
    await copyChapterToClipboard('chapter');
    expect(copied['text/html']).toContain('data:image/png;base64,');
    expect(copied['text/html']).toContain('Chapter illustration');
    expect(copied['text/html']).not.toContain('story-nexus-asset:');
});

test('supports an empty chapter', async () => {
    await db.chapters.update('chapter', { content: '' });
    await copyChapterToClipboard('chapter');
    expect(copied['text/plain']).toBe('');
});

test('rejects missing chapters and malformed content instead of reporting a successful copy', async () => {
    await expect(copyChapterToClipboard('missing')).rejects.toThrow('Chapter not found');
    await db.chapters.update('chapter', { content: 'invalid JSON' });
    await expect(copyChapterToClipboard('chapter')).rejects.toThrow();
});

test('reports an unavailable or denied clipboard', async () => {
    write.mockRejectedValueOnce(new Error('Permission denied'));
    await expect(copyChapterToClipboard('chapter')).rejects.toThrow('Permission denied');
    vi.stubGlobal('navigator', {});
    await expect(copyChapterToClipboard('chapter')).rejects.toThrow('Rich text clipboard is unavailable');
});
