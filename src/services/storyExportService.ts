import { db } from './database';
import type { Story, Chapter, LorebookEntry, LoreBook, SceneBeat, AIChat } from '@/types/story';
import { toast } from 'react-toastify';
import { isTauri } from '@tauri-apps/api/core';

interface StoryExport {
    version: string;
    type: 'story';
    exportDate: string;
    story: Story;
    chapters: Chapter[];
    loreBooks: LoreBook[];
    lorebookEntries: LorebookEntry[];
    sceneBeats: SceneBeat[];
    aiChats: AIChat[];
}

export const storyExportService = {
    /**
     * Export a complete story with all related data
     */
    exportStory: async (storyId: string): Promise<void> => {
        try {
            const { exportData, story } = await storyExportService.buildExportPayload(storyId);

            // Convert to JSON and trigger browser download
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
            const exportName = `story-${story.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportName);
            linkElement.click();

            toast.success(`Story "${story.title}" exported successfully`);
        } catch (error) {
            console.error('Story export failed:', error);
            toast.error(`Export failed: ${(error as Error).message}`);
            throw error;
        }
    },

    /**
     * Assembles the full StoryExport payload for a given story ID.
     * Shared by exportStory, syncStoryToFile, and linkStoryToFile.
     */
    buildExportPayload: async (storyId: string): Promise<{ exportData: StoryExport; story: Story }> => {
        const story = await db.stories.get(storyId);
        if (!story) throw new Error('Story not found');

        const lorebookIds = story.lorebookIds ?? [];
        const loreBooks = lorebookIds.length > 0
            ? await db.loreBooks.where('id').anyOf(lorebookIds).toArray()
            : [];
        const lorebookEntries = lorebookIds.length > 0
            ? await db.lorebookEntries.where('lorebookId').anyOf(lorebookIds).toArray()
            : [];
        const chapters = await db.chapters.where('storyId').equals(storyId).toArray();
        const sceneBeats = await db.sceneBeats.where('storyId').equals(storyId).toArray();
        const aiChats = await db.aiChats.where('storyId').equals(storyId).toArray();

        const exportData: StoryExport = {
            version: '2.0',
            type: 'story',
            exportDate: new Date().toISOString(),
            story,
            chapters,
            loreBooks,
            lorebookEntries,
            sceneBeats,
            aiChats,
        };

        return { exportData, story };
    },

    /**
     * Opens a native save dialog, links the story to the chosen file, and writes the initial snapshot.
     * - Tauri: uses plugin-dialog + plugin-fs, stores full path
     * - Browser (Chrome/Edge): uses File System Access API, stores file handle in IndexedDB
     * Returns the file name/path, or null if cancelled / unsupported.
     */
    linkStoryToFile: async (storyId: string): Promise<string | null> => {
        const { exportData, story } = await storyExportService.buildExportPayload(storyId);
        const defaultName = `story-${story.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
        const json = JSON.stringify(exportData, null, 2);

        try {
            if (isTauri()) {
                const { save } = await import('@tauri-apps/plugin-dialog');
                const { writeTextFile } = await import('@tauri-apps/plugin-fs');

                const filePath = await save({
                    filters: [{ name: 'Story JSON', extensions: ['json'] }],
                    defaultPath: defaultName,
                });
                if (!filePath) return null;

                await writeTextFile(filePath, json);
                await db.stories.update(storyId, { saveFilePath: filePath });
                toast.success(`Story linked to ${filePath}`);
                return filePath;
            }

            if (typeof (window as any).showSaveFilePicker !== 'function') {
                // Browser doesn't support persistent file linking (e.g. Firefox, Brave, Chromium on Linux).
                // Store the filename as the link and trigger downloads on explicit sync.
                const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
                const a = document.createElement('a');
                a.setAttribute('href', dataUri);
                a.setAttribute('download', defaultName);
                a.click();
                await db.stories.update(storyId, { saveFilePath: defaultName });
                toast.info('Story linked. Click the sync button to download an updated copy after editing.');
                return defaultName;
            }

            let handle: FileSystemFileHandle;
            try {
                handle = await (window as any).showSaveFilePicker({
                    suggestedName: defaultName,
                    types: [{ description: 'Story JSON', accept: { 'application/json': ['.json'] } }],
                }) as FileSystemFileHandle;
            } catch (err) {
                if ((err as Error).name === 'AbortError') return null;
                throw err;
            }

            const writable = await handle.createWritable();
            await writable.write(json);
            await writable.close();

            await db.stories.update(storyId, { saveFilePath: handle.name, saveFileHandle: handle });
            toast.success(`Story linked to ${handle.name}. Auto-sync enabled.`);
            return handle.name;
        } catch (error) {
            if ((error as Error).name === 'AbortError') return null; // user cancelled
            console.error('Link to file failed:', error);
            toast.error(`Link to file failed: ${(error as Error).message}`);
            throw error;
        }
    },

    /**
     * Writes the current story snapshot to the story's linked file.
     * No-op if the story has no file linked.
     * - Tauri: writes via plugin-fs
     * - Browser: writes via stored FileSystemFileHandle (re-requests permission if needed)
     */
    syncStoryToFile: async (storyId: string, options?: { explicit?: boolean }): Promise<void> => {
        try {
            const story = await db.stories.get(storyId);
            if (!story?.saveFilePath) return;

            const { exportData } = await storyExportService.buildExportPayload(storyId);
            const json = JSON.stringify(exportData, null, 2);

            if (isTauri()) {
                const { writeTextFile } = await import('@tauri-apps/plugin-fs');
                await writeTextFile(story.saveFilePath, json);
                return;
            }

            if (!story.saveFileHandle) {
                // Browser fallback (Firefox, Brave, Chromium on Linux): trigger download only on
                // explicit user action — skip during auto-sync to avoid spamming downloads.
                if (!options?.explicit) return;
                const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
                const a = document.createElement('a');
                a.setAttribute('href', dataUri);
                a.setAttribute('download', story.saveFilePath);
                a.click();
                return;
            }

            // Re-request write permission if it lapsed (e.g. after a page reload)
            const permission = await (story.saveFileHandle as any).requestPermission({ mode: 'readwrite' });
            if (permission !== 'granted') return;

            const writable = await story.saveFileHandle.createWritable();
            await writable.write(json);
            await writable.close();
        } catch (error) {
            console.error('Sync to file failed:', error);
            // Don't toast for background auto-sync failures — only log them
        }
    },

    /**
     * Clears the saveFilePath association from a story.
     * Future changes will no longer be written to disk automatically.
     */
    unlinkStoryFile: async (storyId: string): Promise<void> => {
        try {
            await db.stories.update(storyId, { saveFilePath: undefined });
            toast.success('File link removed');
        } catch (error) {
            console.error('Unlink file failed:', error);
            toast.error(`Unlink failed: ${(error as Error).message}`);
            throw error;
        }
    },

    /**
     * Opens a file-open dialog and imports the chosen story JSON.
     * The imported story is linked back to the source file for future auto-syncs.
     * - Tauri: uses plugin-dialog + plugin-fs
     * - Browser (Chrome/Edge): uses File System Access API (showOpenFilePicker)
     * - Browser (Firefox/other): falls back to <input type="file">
     * Returns the new story ID, or null if cancelled.
     */
    importFromFile: async (): Promise<string | null> => {
        try {
            if (isTauri()) {
                const { open } = await import('@tauri-apps/plugin-dialog');
                const { readTextFile } = await import('@tauri-apps/plugin-fs');

                const filePath = await open({
                    filters: [{ name: 'Story JSON', extensions: ['json'] }],
                    multiple: false,
                });
                if (!filePath || Array.isArray(filePath)) return null;

                const content = await readTextFile(filePath);
                const newStoryId = await storyExportService.importStory(content);
                await db.stories.update(newStoryId, { saveFilePath: filePath as string });
                return newStoryId;
            }

            // Browser: prefer File System Access API for round-trip sync support
            if (typeof (window as any).showOpenFilePicker === 'function') {
                const [handle] = await (window as any).showOpenFilePicker({
                    types: [{ description: 'Story JSON', accept: { 'application/json': ['.json'] } }],
                    multiple: false,
                }) as FileSystemFileHandle[];

                const file = await handle.getFile();
                const content = await file.text();
                const newStoryId = await storyExportService.importStory(content);
                await db.stories.update(newStoryId, { saveFilePath: handle.name, saveFileHandle: handle });
                return newStoryId;
            }

            // Fallback: basic <input type="file"> for Firefox and other browsers
            return new Promise((resolve) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async () => {
                    const file = input.files?.[0];
                    if (!file) { resolve(null); return; }
                    const content = await file.text();
                    try {
                        const newStoryId = await storyExportService.importStory(content);
                        resolve(newStoryId);
                    } catch {
                        resolve(null);
                    }
                };
                input.oncancel = () => resolve(null);
                input.click();
            });
        } catch (error) {
            if ((error as Error).name === 'AbortError') return null; // user cancelled
            console.error('Import from file failed:', error);
            toast.error(`Import failed: ${(error as Error).message}`);
            throw error;
        }
    },

    /**
     * Import a complete story with all related data.
     * Supports both v1.0 (LorebookEntry.storyId) and v2.0 (LorebookEntry.lorebookId + LoreBook) formats.
     * Returns the ID of the newly imported story.
     */
    importStory: async (jsonData: string): Promise<string> => {
        try {
            const data = JSON.parse(jsonData) as StoryExport & { lorebookEntries?: any[] };

            if (!data.type || data.type !== 'story' || !data.story) {
                throw new Error('Invalid story data format');
            }

            const newStoryId = crypto.randomUUID();
            const idMap = new Map<string, string>();
            idMap.set(data.story.id, newStoryId);

            // --- Normalise lorebook data regardless of export version ---
            // v1.0: entries have .storyId, no loreBooks array
            // v2.0: entries have .lorebookId, loreBooks array present
            const isV1 = !data.version || data.version === '1.0';

            // lorebookId → new lorebookId mapping (for v2.0 books; for v1.0 we create one book)
            const loreBookIdMap = new Map<string, string>();
            const normalizedBooks: LoreBook[] = [];

            if (isV1) {
                // Create a single migration lorebook for all entries
                const migrationLorebookId = crypto.randomUUID();
                loreBookIdMap.set('__v1_migration__', migrationLorebookId);
                normalizedBooks.push({
                    id: migrationLorebookId,
                    name: data.story.title,
                    createdAt: new Date(),
                    isDemo: data.story.isDemo,
                });
            } else {
                for (const book of (data.loreBooks ?? [])) {
                    const newBookId = crypto.randomUUID();
                    loreBookIdMap.set(book.id, newBookId);
                    normalizedBooks.push({ ...book, id: newBookId, createdAt: new Date() });
                }
            }

            const newLorebookIds = normalizedBooks.map(b => b.id);

            const newStory: Story = {
                ...data.story,
                id: newStoryId,
                createdAt: new Date(),
                title: `${data.story.title} (Imported)`,
                lorebookIds: newLorebookIds,
            };

            await db.transaction('rw',
                [db.stories, db.chapters, db.loreBooks, db.lorebookEntries, db.sceneBeats, db.aiChats],
                async () => {
                    await db.stories.add(newStory);

                    for (const book of normalizedBooks) {
                        await db.loreBooks.add(book);
                    }

                    for (const chapter of data.chapters) {
                        const newChapterId = crypto.randomUUID();
                        idMap.set(chapter.id, newChapterId);
                        await db.chapters.add({ ...chapter, id: newChapterId, storyId: newStoryId, createdAt: new Date() });
                    }

                    for (const entry of (data.lorebookEntries ?? [])) {
                        const newEntryId = crypto.randomUUID();
                        const resolvedLorebookId = isV1
                            ? loreBookIdMap.get('__v1_migration__')!
                            : (loreBookIdMap.get(entry.lorebookId) ?? loreBookIdMap.values().next().value ?? '');
                        const cleanEntry = { ...entry };
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        delete (cleanEntry as any).storyId;
                        await db.lorebookEntries.add({ ...cleanEntry, id: newEntryId, lorebookId: resolvedLorebookId, createdAt: new Date() });
                    }

                    for (const sceneBeat of data.sceneBeats) {
                        await db.sceneBeats.add({
                            ...sceneBeat,
                            id: crypto.randomUUID(),
                            storyId: newStoryId,
                            chapterId: idMap.get(sceneBeat.chapterId) || sceneBeat.chapterId,
                            createdAt: new Date()
                        });
                    }

                    for (const chat of data.aiChats) {
                        await db.aiChats.add({ ...chat, id: crypto.randomUUID(), storyId: newStoryId, createdAt: new Date(), updatedAt: new Date() });
                    }
                }
            );

            toast.success(`Story "${newStory.title}" imported successfully`);
            return newStoryId;
        } catch (error) {
            console.error('Story import failed:', error);
            toast.error(`Import failed: ${(error as Error).message}`);
            throw error;
        }
    }
}; 