import type { LorebookEntry } from "@/types/story";

export type LorebookEntryInput = Partial<LorebookEntry> & {
  tags?: unknown;
  aliases?: unknown;
};

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(String).map((item) => item.trim()).filter(Boolean)
    : [];
}

export function normalizeLorebookEntry<T extends LorebookEntryInput>(entry: T): T & Pick<LorebookEntry, "aliases" | "tags"> {
  const hasAliases = Array.isArray(entry.aliases);
  const aliases = hasAliases ? toStringArray(entry.aliases) : toStringArray(entry.tags);
  const tags = hasAliases ? toStringArray(entry.tags) : [];

  return {
    ...entry,
    aliases,
    tags,
  };
}

export function normalizeLorebookEntries<T extends LorebookEntryInput>(entries: T[]): Array<T & Pick<LorebookEntry, "aliases" | "tags">> {
  return entries.map(normalizeLorebookEntry);
}

export function getLorebookAliases(entry: LorebookEntryInput): string[] {
  return normalizeLorebookEntry(entry).aliases;
}
