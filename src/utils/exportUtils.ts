import { $generateHtmlFromNodes } from '@lexical/html';
import { LexicalEditor } from 'lexical';
import { Story, Chapter } from '@/types/story';
import { db } from '@/services/database';

/**
 * Converts Lexical JSON content to HTML
 * @param jsonContent The Lexical JSON content string
 * @returns HTML string representation of the content
 */
export async function convertLexicalToHtml(jsonContent: string): Promise<string> {
    try {
        // Parse the Lexical state
        const editorState = JSON.parse(jsonContent);

        // Create a temporary DOM element to hold the HTML
        const container = document.createElement('div');

        // Process nodes recursively
        const processNode = (node: any, parentElement: HTMLElement) => {
            if (node.type === 'text') {
                const textNode = document.createTextNode(node.text);
                parentElement.appendChild(textNode);
            } else if (node.type === 'paragraph') {
                const p = document.createElement('p');
                if (node.children) {
                    node.children.forEach((child: any) => processNode(child, p));
                }
                parentElement.appendChild(p);
            } else if (node.type === 'heading') {
                const headingTag = `h${node.tag}`;
                const heading = document.createElement(headingTag);
                if (node.children) {
                    node.children.forEach((child: any) => processNode(child, heading));
                }
                parentElement.appendChild(heading);
            } else if (node.children) {
                // For other node types with children, process the children
                node.children.forEach((child: any) => processNode(child, parentElement));
            }
        };

        // Process the root node
        if (editorState.root?.children) {
            editorState.root.children.forEach((node: any) => processNode(node, container));
        }

        return container.innerHTML;
    } catch (error) {
        console.error('Failed to convert Lexical to HTML:', error);
        return '';
    }
}

/**
 * Downloads content as a file
 * @param content The content to download
 * @param filename The name of the file
 * @param contentType The MIME type of the content
 */
export function downloadAsFile(content: string, filename: string, contentType: string) {
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
    try {
        // Get the story
        const story = await db.stories.get(storyId);
        if (!story) {
            throw new Error('Story not found');
        }

        // Get all chapters for the story
        const chapters = await db.chapters
            .where('storyId')
            .equals(storyId)
            .sortBy('order');

        if (format === 'html') {
            // Create HTML content
            let htmlContent = `<!DOCTYPE html>
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
  </div>`;

            // Add each chapter
            for (const chapter of chapters) {
                htmlContent += `<div class="chapter">
    <h2 class="chapter-title">Chapter ${chapter.order}: ${chapter.title}</h2>`;

                // Convert chapter content to HTML
                const chapterHtml = await convertLexicalToHtml(chapter.content);
                htmlContent += `<div class="chapter-content">${chapterHtml}</div>
  </div>`;
            }

            htmlContent += `</body>
</html>`;

            // Download the HTML file
            downloadAsFile(htmlContent, `${story.title}.html`, 'text/html');
        } else {
            // Create plain text content
            let textContent = `${story.title}\n`;
            textContent += `Author: ${story.author}\n`;
            if (story.synopsis) {
                textContent += `Synopsis: ${story.synopsis}\n`;
            }
            textContent += '\n\n';

            // Add each chapter
            for (const chapter of chapters) {
                textContent += `Chapter ${chapter.order}: ${chapter.title}\n\n`;

                // Get chapter plain text
                try {
                    // Parse the Lexical state
                    const editorState = JSON.parse(chapter.content);
                    let plainText = '';

                    const processNode = (node: any) => {
                        if (node.type === 'text') {
                            plainText += node.text;
                        } else if (node.children) {
                            node.children.forEach(processNode);
                        }
                        if (node.type === 'paragraph') {
                            plainText += '\n\n';
                        }
                    };

                    if (editorState.root?.children) {
                        editorState.root.children.forEach(processNode);
                    }

                    textContent += plainText.trim() + '\n\n';
                } catch (error) {
                    console.error('Failed to parse chapter content:', error);
                }
            }

            // Download the text file
            downloadAsFile(textContent, `${story.title}.txt`, 'text/plain');
        }
    } catch (error) {
        console.error('Failed to download story:', error);
        throw error;
    }
}

/**
 * Downloads a chapter as HTML or plain text
 * @param chapterId The ID of the chapter to download
 * @param format The format to download ('html' or 'text')
 */
export async function downloadChapter(chapterId: string, format: 'html' | 'text') {
    try {
        // Get the chapter
        const chapter = await db.chapters.get(chapterId);
        if (!chapter) {
            throw new Error('Chapter not found');
        }

        // Get the story
        const story = await db.stories.get(chapter.storyId);
        if (!story) {
            throw new Error('Story not found');
        }

        if (format === 'html') {
            // Create HTML content
            let htmlContent = `<!DOCTYPE html>
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
    <h2 class="chapter-title">Chapter ${chapter.order}: ${chapter.title}</h2>`;

            // Convert chapter content to HTML
            const chapterHtml = await convertLexicalToHtml(chapter.content);
            htmlContent += `<div class="chapter-content">${chapterHtml}</div>
  </div>
</body>
</html>`;

            // Download the HTML file
            downloadAsFile(htmlContent, `${story.title} - Chapter ${chapter.order}.html`, 'text/html');
        } else {
            // Create plain text content
            let textContent = `${story.title}\n`;
            textContent += `Chapter ${chapter.order}: ${chapter.title}\n\n`;

            // Get chapter plain text
            try {
                // Parse the Lexical state
                const editorState = JSON.parse(chapter.content);
                let plainText = '';

                const processNode = (node: any) => {
                    if (node.type === 'text') {
                        plainText += node.text;
                    } else if (node.children) {
                        node.children.forEach(processNode);
                    }
                    if (node.type === 'paragraph') {
                        plainText += '\n\n';
                    }
                };

                if (editorState.root?.children) {
                    editorState.root.children.forEach(processNode);
                }

                textContent += plainText.trim();
            } catch (error) {
                console.error('Failed to parse chapter content:', error);
            }

            // Download the text file
            downloadAsFile(textContent, `${story.title} - Chapter ${chapter.order}.txt`, 'text/plain');
        }
    } catch (error) {
        console.error('Failed to download chapter:', error);
        throw error;
    }
} 