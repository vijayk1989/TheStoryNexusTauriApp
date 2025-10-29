import { db } from '@/services/database';
import type { LorebookEntry } from '@/types/story';

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
        try {
            const data = JSON.parse(jsonData);

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
                await db.lorebookEntries.add(newEntry);
                newEntries.push(newEntry);
            }

            onEntriesAdded(newEntries);
        } catch (error) {
            console.error('Error importing lorebook entries:', error);
            throw error;
        }
    }
}
