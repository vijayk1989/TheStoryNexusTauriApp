import { describe, expect, test } from "vitest";

import {
  getDefaultSelectedLorebookImportIndexes,
  getLorebookImportWarnings,
  normalizeLorebookImportCategory,
  toLorebookEntryCreateInput,
} from "@/features/lorebook/utils/lorebookJsonImport";
import type { LorebookEntry } from "@/types/story";

const existingEntry: LorebookEntry = {
  id: "existing-1",
  storyId: "story-1",
  name: "Mara",
  description: "An existing cartographer.",
  category: "character",
  aliases: ["Mara"],
  tags: [],
  metadata: {},
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

describe("lorebook JSON import helpers", () => {
  test("normalizes unknown categories to note while keeping newer categories", () => {
    expect(normalizeLorebookImportCategory("magic system")).toBe("magic system");
    expect(normalizeLorebookImportCategory("world rule")).toBe("world rule");
    expect(normalizeLorebookImportCategory("artifact" as any)).toBe("note");
    expect(normalizeLorebookImportCategory(undefined)).toBe("note");
  });

  test("leaves duplicate names unselected by default", () => {
    const selected = getDefaultSelectedLorebookImportIndexes(
      [
        { name: "Mara" },
        { name: "The Glass Harbor" },
        { name: " mara " },
      ],
      [existingEntry]
    );

    expect([...selected]).toEqual([1]);
  });

  test("warns about duplicate names and broad aliases", () => {
    expect(
      getLorebookImportWarnings(
        { name: "mara", aliases: ["the", "cartographer"] },
        [existingEntry]
      )
    ).toEqual([
      "Duplicate name already exists in this story.",
      "Broad aliases may overmatch prose: the",
    ]);
  });

  test("converts parsed partial entries into create-entry input", () => {
    expect(
      toLorebookEntryCreateInput("story-2", {
        name: "Wand Magic",
        description: "Spellcasting depends on intent.",
        category: "magic system",
        aliases: ["spellcasting"],
      })
    ).toEqual({
      storyId: "story-2",
      name: "Wand Magic",
      description: "Spellcasting depends on intent.",
      category: "magic system",
      aliases: ["spellcasting"],
      tags: [],
      metadata: {},
      isDisabled: false,
    });
  });
});
