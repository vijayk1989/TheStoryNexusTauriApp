import { beforeEach, describe, expect, test } from "vitest";

import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";
import { db } from "@/services/database";
import type { LorebookEntry } from "@/types/story";
import { resetTestDb } from "./testDb";

describe("useLorebookStore", () => {
  beforeEach(async () => {
    await resetTestDb();
    resetLorebookStore();
  });

  test("normalizes legacy tags into aliases when loading entries", async () => {
    await db.lorebookEntries.add({
      id: "legacy-lore",
      storyId: "story-1",
      createdAt: new Date(),
      name: "Evelyn Ashcroft",
      description: "A duchess with many names.",
      category: "character",
      tags: ["Evelyn", "Lady Ashcroft"],
    } as any);

    await useLorebookStore.getState().loadEntries("story-1");
    useLorebookStore.getState().buildAliasMap();

    const entry = useLorebookStore.getState().entries[0];
    expect(entry.aliases).toEqual(["Evelyn", "Lady Ashcroft"]);
    expect(entry.tags).toEqual([]);
    expect(useLorebookStore.getState().aliasMap.evelyn?.id).toBe("legacy-lore");
    expect(useLorebookStore.getState().aliasMap["lady ashcroft"]?.id).toBe("legacy-lore");
  });

  test("buildAliasMap matches names and aliases, not descriptive tags", () => {
    useLorebookStore.setState({
      entries: [
        lore("entry-1", {
          name: "Evelyn Ashcroft",
          aliases: ["Lady Ashcroft", "Ashcroft"],
          tags: ["beautiful", "skillful"],
        }),
        lore("entry-2", {
          name: "Hidden Entry",
          aliases: ["Hidden"],
          tags: ["secret"],
          isDisabled: true,
        }),
      ],
    });

    useLorebookStore.getState().buildAliasMap();
    const aliasMap = useLorebookStore.getState().aliasMap;

    expect(aliasMap["evelyn ashcroft"]?.id).toBe("entry-1");
    expect(aliasMap["lady ashcroft"]?.id).toBe("entry-1");
    expect(aliasMap.ashcroft?.id).toBe("entry-1");
    expect(aliasMap.lady).toBeUndefined();
    expect(aliasMap.beautiful).toBeUndefined();
    expect(aliasMap.hidden).toBeUndefined();
  });

  test("retrieves aliases and tags separately while excluding disabled entries", () => {
    useLorebookStore.setState({
      entries: [
        lore("entry-1", {
          name: "Mara",
          aliases: ["the mapmaker"],
          tags: ["cartographer"],
        }),
        lore("entry-2", {
          name: "Disabled Mara",
          aliases: ["the mapmaker"],
          tags: ["cartographer"],
          isDisabled: true,
        }),
      ],
    });

    expect(useLorebookStore.getState().getEntriesByAlias("THE MAPMAKER").map((entry) => entry.id)).toEqual([
      "entry-1",
    ]);
    expect(useLorebookStore.getState().getEntriesByTag("CARTOGRAPHER").map((entry) => entry.id)).toEqual([
      "entry-1",
    ]);
    expect(useLorebookStore.getState().getEntriesByAlias("cartographer")).toEqual([]);
    expect(useLorebookStore.getState().getEntriesByTag("the mapmaker")).toEqual([]);
  });

  test("updates rebuild alias matches without losing descriptive tags", async () => {
    await useLorebookStore.getState().createEntry({
      storyId: "story-1",
      name: "Mara",
      description: "A cartographer with a hidden map.",
      category: "character",
      aliases: ["Mara", "the mapmaker"],
      tags: ["cartographer"],
      metadata: {},
      isDisabled: false,
    });
    const entryId = useLorebookStore.getState().entries[0].id;

    expect(useLorebookStore.getState().aliasMap["the mapmaker"]?.id).toBe(entryId);

    await useLorebookStore.getState().updateEntry(entryId, { isDisabled: true });
    const disabledEntry = await db.lorebookEntries.get(entryId);

    expect(disabledEntry?.aliases).toEqual(["Mara", "the mapmaker"]);
    expect(disabledEntry?.tags).toEqual(["cartographer"]);
    expect(useLorebookStore.getState().aliasMap["the mapmaker"]).toBeUndefined();

    await useLorebookStore.getState().updateEntryAndRebuildAliases(entryId, {
      aliases: ["Mara Vale"],
      tags: ["navigator"],
      isDisabled: false,
    });

    expect(useLorebookStore.getState().aliasMap["mara vale"]?.id).toBe(entryId);
    expect(useLorebookStore.getState().getEntriesByTag("navigator").map((entry) => entry.id)).toEqual([
      entryId,
    ]);
  });
});

function resetLorebookStore(): void {
  useLorebookStore.setState({
    entries: [],
    isLoading: false,
    error: null,
    aliasMap: {},
    editorContent: "",
    matchedEntries: new Map(),
    chapterMatchedEntries: new Map(),
  });
}

function lore(
  id: string,
  overrides: Partial<LorebookEntry> & Pick<LorebookEntry, "name" | "aliases" | "tags">
): LorebookEntry {
  return {
    id,
    storyId: "story-1",
    createdAt: new Date(),
    name: overrides.name,
    description: "Lore entry",
    category: "character",
    aliases: overrides.aliases,
    tags: overrides.tags,
    metadata: overrides.metadata,
    isDisabled: overrides.isDisabled,
  };
}
