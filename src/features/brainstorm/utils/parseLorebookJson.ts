import type { LorebookEntry } from '@/types/story';

type ParseResult = {
  entries: Partial<LorebookEntry>[];
  error?: string;
};

// Attempt to extract JSON from a message. Prefer fenced ```json blocks,
// then any fenced block, then the whole message as a last resort.
export function parseLorebookJson(message: string): ParseResult {
  if (!message || !message.trim()) return { entries: [] };

  const tryParse = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
      return [parsed];
    } catch (err) {
      return null;
    }
  };

  // 1) fenced json blocks
  const fencedJsonRegex = /```json\s*([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  const results: any[] = [];
  while ((match = fencedJsonRegex.exec(message)) !== null) {
    const block = match[1].trim();
    const parsed = tryParse(block);
    if (parsed) results.push(...parsed);
  }
  if (results.length > 0) {
    return { entries: sanitizeResults(results) };
  }

  // 2) any fenced block
  const fencedAnyRegex = /```\s*([\s\S]*?)```/gi;
  while ((match = fencedAnyRegex.exec(message)) !== null) {
    const block = match[1].trim();
    const parsed = tryParse(block);
    if (parsed) results.push(...parsed);
  }
  if (results.length > 0) {
    return { entries: sanitizeResults(results) };
  }

  // 3) try the whole message
  const wholeParsed = tryParse(message.trim());
  if (wholeParsed) return { entries: sanitizeResults(wholeParsed) };

  return { entries: [], error: 'No valid JSON detected' };
}

function sanitizeResults(raw: any[]): Partial<LorebookEntry>[] {
  const allowedCategories = new Set([
    'character',
    'location',
    'item',
    'event',
    'note',
    'synopsis',
    'starting scenario',
    'timeline',
  ]);

  return raw
    .filter((obj) => obj && typeof obj === 'object')
    .map((obj) => {
      const name = typeof obj.name === 'string' ? obj.name.trim() : undefined;
      const description = typeof obj.description === 'string' ? obj.description : undefined;
      const tags = Array.isArray(obj.tags) ? obj.tags.map(String) : undefined;
      const category = typeof obj.category === 'string' ? obj.category.toLowerCase() : undefined;
      const metadata = obj.metadata && typeof obj.metadata === 'object' ? obj.metadata : undefined;
      const isDisabled = typeof obj.isDisabled === 'boolean' ? obj.isDisabled : undefined;

      const entry: Partial<LorebookEntry> = {};
      if (name) entry.name = name;
      if (description) entry.description = description;
      if (tags) entry.tags = tags;
      if (category) entry.category = allowedCategories.has(category) ? (category as any) : category;
      if (metadata) entry.metadata = metadata;
      if (typeof isDisabled !== 'undefined') entry.isDisabled = isDisabled;

      return entry;
    })
    .filter((e) => e.name); // require name
}

export default parseLorebookJson;
