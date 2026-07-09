import {
  LOREBOOK_CATEGORIES,
  type LorebookCategory,
  type LorebookEntry,
} from "@/types/story";

export type LorebookEntryCreateInput = Omit<LorebookEntry, "id" | "createdAt">;

export function normalizeLorebookImportCategory(
  category: Partial<LorebookEntry>["category"]
): LorebookCategory {
  return category && LOREBOOK_CATEGORIES.includes(category) ? category : "note";
}

export function toLorebookEntryCreateInput(
  storyId: string,
  entry: Partial<LorebookEntry>
): LorebookEntryCreateInput {
  return {
    storyId,
    name: entry.name || "Untitled entry",
    description: entry.description || "",
    category: normalizeLorebookImportCategory(entry.category),
    aliases: entry.aliases || [],
    tags: entry.tags || [],
    metadata: entry.metadata || {},
    isDisabled: entry.isDisabled ?? false,
  };
}

export function getDefaultSelectedLorebookImportIndexes(
  entries: Partial<LorebookEntry>[],
  existingEntries: LorebookEntry[]
): Set<number> {
  const existingNames = new Set(
    existingEntries.map((entry) => entry.name.toLowerCase().trim())
  );

  return new Set(
    entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => {
        const normalizedName = entry.name?.toLowerCase().trim();
        return !normalizedName || !existingNames.has(normalizedName);
      })
      .map(({ index }) => index)
  );
}

export function getLorebookImportWarnings(
  entry: Partial<LorebookEntry>,
  existingEntries: LorebookEntry[]
): string[] {
  const warnings: string[] = [];
  const normalizedName = entry.name?.toLowerCase().trim();

  if (
    normalizedName &&
    existingEntries.some((item) => item.name.toLowerCase().trim() === normalizedName)
  ) {
    warnings.push("Duplicate name already exists in this story.");
  }

  const broadAliases = (entry.aliases || []).filter(isBroadLorebookAlias);
  if (broadAliases.length > 0) {
    warnings.push(`Broad aliases may overmatch prose: ${broadAliases.join(", ")}`);
  }

  return warnings;
}

export function isBroadLorebookAlias(alias: string): boolean {
  const normalized = alias.toLowerCase().trim();
  const broadTerms = new Set([
    "a",
    "an",
    "the",
    "he",
    "she",
    "they",
    "we",
    "i",
    "magic",
    "school",
    "city",
    "world",
    "kingdom",
    "empire",
    "war",
  ]);

  return normalized.length < 3 || broadTerms.has(normalized);
}
