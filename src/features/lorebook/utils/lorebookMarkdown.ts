import type { LorebookEntry } from '@/types/story';

function inline(value: string): string {
    return value.replace(/\s+/g, ' ').trim().replace(/[\\`*_{}\[\]()<>#+.!|~-]/g, '\\$&');
}

export function lorebookToMarkdown(entries: LorebookEntry[], relatedEntries = entries): string {
    const names = new Map(relatedEntries.map(entry => [entry.id, entry.name]));
    return entries.map(entry => {
        const lines = [`# ${inline(entry.name)}`, '', `- **Category:** ${inline(entry.category)}`];
        if (entry.aliases?.length) lines.push(`- **Aliases:** ${entry.aliases.map(inline).join(', ')}`);
        if (entry.tags?.length) lines.push(`- **Tags:** ${entry.tags.map(inline).join(', ')}`);
        if (entry.isDisabled) lines.push('- **Disabled:** Yes');
        const metadata = entry.metadata;
        for (const [label, value] of [
            ['Type', metadata?.type],
            ['Importance', metadata?.importance],
            ['Status', metadata?.status],
        ]) {
            if (value) lines.push(`- **${label}:** ${inline(value)}`);
        }
        if (entry.description?.trim()) lines.push('', '## Description', '', entry.description.trim());
        if (metadata?.relationships?.length) {
            lines.push('', '## Relationships', '');
            for (const relationship of metadata.relationships) {
                const target = names.get(relationship.targetId) || relationship.targetId;
                lines.push(`- **${inline(relationship.type)}:** ${inline(target)}${relationship.description ? ` — ${inline(relationship.description)}` : ''}`);
            }
        }
        const fields = Object.entries(metadata?.customFields || {});
        if (fields.length) {
            lines.push('', '## Custom Fields');
            for (const [key, value] of fields) {
                lines.push('', `### ${inline(key)}`, '');
                if (typeof value === 'string') {
                    lines.push(value);
                } else {
                    const json = JSON.stringify(value, null, 2) ?? 'null';
                    const fence = '`'.repeat(Math.max(3, ...Array.from(json.matchAll(/`+/g), match => match[0].length + 1)));
                    lines.push(`${fence}json`, json, fence);
                }
            }
        }
        return lines.join('\n');
    }).join('\n\n---\n\n') + (entries.length ? '\n' : '');
}
