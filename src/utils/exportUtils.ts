import { db } from '@/services/database';

interface SerializedLexicalNode {
    type: string;
    text?: string;
    children?: SerializedLexicalNode[];
    tag?: string;
    version?: number;
}

interface LexicalEditorState {
    root?: {
        children?: SerializedLexicalNode[];
    };
}

/**
 * Extracts plain text from a Lexical node recursively
 * @param node The Lexical node to extract text from
 * @returns Plain text content
 */
const extractTextFromNode = (node: SerializedLexicalNode): string => {
    if (node.type === 'text' && node.text) {
        return node.text;
    }

    const childrenText = node.children
        ? node.children.map(extractTextFromNode).join('')
        : '';

    const lineBreak = node.type === 'paragraph' ? '\n\n' : '';

    return childrenText + lineBreak;
};

/**
 * Extracts plain text from Lexical JSON content
 * @param jsonContent The Lexical JSON content string
 * @returns Plain text representation of the content
 */
const extractPlainTextFromLexical = (jsonContent: string): string => {
    const editorState: LexicalEditorState = JSON.parse(jsonContent);

    if (!editorState.root?.children) {
        return '';
    }

    return editorState.root.children
        .map(extractTextFromNode)
        .join('');
};

/**
 * Converts Lexical JSON content to HTML
 * @param jsonContent The Lexical JSON content string
 * @returns HTML string representation of the content
 */
async function convertLexicalToHtml(jsonContent: string): Promise<string> {
    const editorState: LexicalEditorState = JSON.parse(jsonContent);
    const container = document.createElement('div');

    const processNode = (node: SerializedLexicalNode, parentElement: HTMLElement): void => {
        if (node.type === 'text' && node.text) {
            const textNode = document.createTextNode(node.text);
            parentElement.appendChild(textNode);
        } else if (node.type === 'paragraph') {
            const p = document.createElement('p');
            if (node.children) {
                node.children.forEach((child) => processNode(child, p));
            }
            parentElement.appendChild(p);
        } else if (node.type === 'heading' && node.tag) {
            const headingTag = `h${node.tag}`;
            const heading = document.createElement(headingTag);
            if (node.children) {
                node.children.forEach((child) => processNode(child, heading));
            }
            parentElement.appendChild(heading);
        } else if (node.children) {
            node.children.forEach((child) => processNode(child, parentElement));
        }
    };

    if (editorState.root?.children) {
        editorState.root.children.forEach((node) => processNode(node, container));
    }

    return container.innerHTML;
}

/**
 * Downloads content as a file
 * @param content The content to download
 * @param filename The name of the file
 * @param contentType The MIME type of the content
 */
function downloadAsFile(content: string, filename: string, contentType: string) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    // Clean up
    URL.revokeObjectURL(url);
}

/**
 * Downloads a story as HTML or plain text
 * @param storyId The ID of the story to download
 * @param format The format to download ('html' or 'text')
 */
export async function downloadStory(storyId: string, format: 'html' | 'text') {
    const story = await db.stories.get(storyId);
    if (!story) {
        throw new Error('Story not found');
    }

    const chapters = await db.chapters
        .where('storyId')
        .equals(storyId)
        .sortBy('order');

    if (format === 'html') {
        const chapterHtmlParts = await Promise.all(
            chapters.map(async (chapter) => {
                const chapterHtml = await convertLexicalToHtml(chapter.content);
                return `<div class="chapter">
    <h2 class="chapter-title">Chapter ${chapter.order}: ${chapter.title}</h2>
    <div class="chapter-content">${chapterHtml}</div>
  </div>`;
            })
        );

        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${story.title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { text-align: center; }
    h2 { margin-top: 40px; }
    .chapter { margin-bottom: 30px; }
    .chapter-title { font-size: 24px; margin-bottom: 10px; }
    .meta { color: #666; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>${story.title}</h1>
  <div class="meta">
    <p>Author: ${story.author}</p>
    ${story.synopsis ? `<p>Synopsis: ${story.synopsis}</p>` : ''}
  </div>
  ${chapterHtmlParts.join('\n')}
</body>
</html>`;

        downloadAsFile(htmlContent, `${story.title}.html`, 'text/html');
    } else {
        const chapterTextParts = await Promise.all(
            chapters.map(async (chapter) => {
                const chapterPlainText = extractPlainTextFromLexical(chapter.content);
                return `Chapter ${chapter.order}: ${chapter.title}\n\n${chapterPlainText.trim()}`;
            })
        );

        const synopsisPart = story.synopsis ? `Synopsis: ${story.synopsis}\n` : '';
        const headerPart = `${story.title}\nAuthor: ${story.author}\n${synopsisPart}\n\n`;
        const textContent = headerPart + chapterTextParts.join('\n\n');

        downloadAsFile(textContent, `${story.title}.txt`, 'text/plain');
    }
}

/**
 * Downloads a chapter as HTML or plain text
 * @param chapterId The ID of the chapter to download
 * @param format The format to download ('html' or 'text')
 */
export async function downloadChapter(chapterId: string, format: 'html' | 'text') {
    const chapter = await db.chapters.get(chapterId);
    if (!chapter) {
        throw new Error('Chapter not found');
    }

    const story = await db.stories.get(chapter.storyId);
    if (!story) {
        throw new Error('Story not found');
    }

    if (format === 'html') {
        const chapterHtml = await convertLexicalToHtml(chapter.content);
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${story.title} - Chapter ${chapter.order}: ${chapter.title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { text-align: center; }
    h2 { margin-top: 40px; }
    .chapter { margin-bottom: 30px; }
    .chapter-title { font-size: 24px; margin-bottom: 10px; }
    .meta { color: #666; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>${story.title}</h1>
  <div class="chapter">
    <h2 class="chapter-title">Chapter ${chapter.order}: ${chapter.title}</h2>
    <div class="chapter-content">${chapterHtml}</div>
  </div>
</body>
</html>`;

        downloadAsFile(htmlContent, `${story.title} - Chapter ${chapter.order}.html`, 'text/html');
    } else {
        const chapterPlainText = extractPlainTextFromLexical(chapter.content);
        const textContent = `${story.title}\nChapter ${chapter.order}: ${chapter.title}\n\n${chapterPlainText.trim()}`;
        downloadAsFile(textContent, `${story.title} - Chapter ${chapter.order}.txt`, 'text/plain');
    }
} 