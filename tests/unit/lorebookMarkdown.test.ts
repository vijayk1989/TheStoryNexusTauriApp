import { describe, expect, test } from 'vitest';
import type { LorebookEntry } from '@/types/story';
import { lorebookToMarkdown } from '@/features/lorebook/utils/lorebookMarkdown';

const entry: LorebookEntry = {
    id: 'hero', storyId: 'story', createdAt: new Date(), updatedAt: new Date(),
    name: 'Aster', category: 'character', aliases: ['The Wanderer'], tags: ['hero'],
    description: 'First paragraph.\n\n**A secret**\n\n- Keeps a journal',
};

describe('lorebook Markdown', () => {
    test('preserves full description formatting and exports structured metadata', () => {
        const markdown = lorebookToMarkdown([{
            ...entry, isDisabled: true,
            metadata: {
                type: 'Mage', importance: 'major', status: 'active',
                relationships: [{ targetId: 'mentor', type: 'Student of', description: 'Since childhood' }],
                customFields: { Age: 0, Retired: false, Abilities: ['Fire', 'Ice'] },
            },
        }], [{ ...entry, id: 'mentor', name: 'Mira' }]);
        expect(markdown).toContain('# Aster\n\n- **Category:** character');
        expect(markdown).toContain('- **Aliases:** The Wanderer');
        expect(markdown).toContain('- **Tags:** hero');
        expect(markdown).toContain('- **Disabled:** Yes');
        expect(markdown).toContain('- **Importance:** major');
        expect(markdown).toContain(entry.description);
        expect(markdown).toContain('- **Student of:** Mira — Since childhood');
        expect(markdown).toContain('### Age\n\n```json\n0\n```');
        expect(markdown).toContain('### Retired\n\n```json\nfalse\n```');
        expect(markdown).toContain('"Fire",\n  "Ice"');
        expect(markdown).not.toContain('storyId');
    });

    test('omits absent sections and separates multiple entries without filtering disabled entries', () => {
        const markdown = lorebookToMarkdown([entry, { ...entry, name: 'Mira', isDisabled: true }]);
        expect(markdown).toContain('\n\n---\n\n# Mira');
        expect(markdown).not.toContain('## Relationships');
        expect(markdown).not.toContain('## Custom Fields');
        expect(lorebookToMarkdown([])).toBe('');
    });

    test('escapes inline Markdown and retains unresolved relationship references', () => {
        const markdown = lorebookToMarkdown([{
            ...entry, name: '*Aster*\n# Title',
            metadata: { relationships: [{ targetId: 'missing', type: 'Knows' }] },
        }]);
        expect(markdown).toContain('# \\*Aster\\* \\# Title\n');
        expect(markdown).toContain('- **Knows:** missing');
    });
});
