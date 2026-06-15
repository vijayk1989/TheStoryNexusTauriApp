import { beforeEach, describe, expect, test } from "vitest";

import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import type { Chapter } from "@/types/story";
import { resetTestDb } from "./testDb";

describe("useChapterStore", () => {
  beforeEach(async () => {
    await resetTestDb();
    useChapterStore.getState().resetChapterState();
  });

  test("clears stale chapter rail state after site-wide data removal", () => {
    const staleChapter = chapter("stale-chapter", "stale-story");

    useChapterStore.setState({
      chapters: [staleChapter],
      currentChapter: staleChapter,
      loading: true,
      error: "Stale error",
      summariesSoFar: "Old summary",
      lastEditedChapterIds: { "stale-story": "stale-chapter" },
    });

    useChapterStore.getState().resetChapterState();

    expect(useChapterStore.getState()).toMatchObject({
      chapters: [],
      currentChapter: null,
      loading: false,
      error: null,
      summariesSoFar: "",
      lastEditedChapterIds: {},
    });
  });
});

function chapter(id: string, storyId: string): Chapter {
  return {
    id,
    storyId,
    createdAt: new Date(),
    title: "Chapter 1",
    content: "",
    order: 1,
    wordCount: 0,
  };
}
