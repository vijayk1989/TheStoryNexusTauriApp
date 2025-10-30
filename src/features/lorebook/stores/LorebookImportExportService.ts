import { db } from '@/services/database';
import type { LorebookEntry } from '@/types/story';
import { attemptPromise, attempt } from '@jfdi/attempt';

export class LorebookImportExportService {
    static exportEntries(entries: LorebookEntry[], storyId: string): void {
        const entriesToExport = entries.filter(entry => entry.storyId === storyId);

        const exportData = {
            version: '1.0',
            type: 'lorebook',
            entries: entriesToExport
        };

        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lorebook-${storyId}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static async importEntries(
        jsonData: string,
        targetStoryId: string,
        onEntriesAdded: (entries: LorebookEntry[]) => void
    ): Promise<void> {
        const [parseError, data] = attempt(() => JSON.parse(jsonData));

        if (parseError) {
            console.error('Error parsing lorebook entries:', parseError);
            throw parseError;
        }

        if (data.type !== 'lorebook') {
            throw new Error('Invalid lorebook export file');
        }

        if (!Array.isArray(data.entries)) {
            throw new Error('Invalid lorebook entries data');
        }

        const newEntries: LorebookEntry[] = [];

        for (const entry of data.entries) {
            const newEntry: LorebookEntry = {
                ...entry,
                id: crypto.randomUUID(),
                storyId: targetStoryId,
                createdAt: new Date(),
            };

            const [addError] = await attemptPromise(() =>
                db.lorebookEntries.add(newEntry)
            );

            if (addError) {
                console.error('Error adding lorebook entry:', addError);
                throw addError;
            }

            newEntries.push(newEntry);
        }

        onEntriesAdded(newEntries);
    }
}
