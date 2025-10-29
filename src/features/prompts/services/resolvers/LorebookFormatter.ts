import { LorebookEntry } from '@/types/story';
import { ILorebookFormatter } from './types';

export class LorebookFormatter implements ILorebookFormatter {
    formatEntries(entries: LorebookEntry[]): string {
        return entries.map(entry => {
            const metadata = entry.metadata;
            return `${entry.category.toUpperCase()}: ${entry.name}
Type: ${metadata?.type || 'Unknown'}
Description: ${entry.description}
${metadata?.relationships?.length ? '\nRelationships:\n' +
                    metadata.relationships.map(r => `- ${r.type}: ${r.description}`).join('\n')
                    : ''}`;
        }).join('\n\n');
    }
}
