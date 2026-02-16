import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/database", () => ({
  db: {
    stories: {
      toArray: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
    },
    createNewStory: vi.fn(),
    getFullStory: vi.fn(),
    deleteStoryWithRelated: vi.fn(),
  },
}));

import { db } from "@/services/database";
import { useStoryStore } from "./useStoryStore";

type MockedStoryDb = {
  stories: {
    toArray: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  createNewStory: ReturnType<typeof vi.fn>;
  getFullStory: ReturnType<typeof vi.fn>;
  deleteStoryWithRelated: ReturnType<typeof vi.fn>;
};

const mockedDb = db as unknown as MockedStoryDb;

function resetStore() {
  useStoryStore.setState({
    stories: [],
    currentStory: null,
    loading: false,
    error: null,
  });
}

describe("useStoryStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  it("fetchStories loads stories from the database", async () => {
    const now = new Date("2026-02-16T00:00:00.000Z");
    mockedDb.stories.toArray.mockResolvedValue([
      {
        id: "story-1",
        title: "Story One",
        author: "Ari",
        language: "en",
        createdAt: now,
      },
    ]);

    await useStoryStore.getState().fetchStories();

    const state = useStoryStore.getState();
    expect(mockedDb.stories.toArray).toHaveBeenCalledTimes(1);
    expect(state.stories).toHaveLength(1);
    expect(state.stories[0].id).toBe("story-1");
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("createStory persists a story and selects it", async () => {
    const now = new Date("2026-02-16T00:00:00.000Z");
    mockedDb.createNewStory.mockResolvedValue("story-2");
    mockedDb.stories.get.mockResolvedValue({
      id: "story-2",
      title: "Draft",
      author: "Ari",
      language: "en",
      synopsis: "A draft synopsis",
      createdAt: now,
    });

    const storyId = await useStoryStore.getState().createStory({
      title: "Draft",
      author: "Ari",
      language: "en",
      synopsis: "A draft synopsis",
    });

    const state = useStoryStore.getState();
    expect(storyId).toBe("story-2");
    expect(mockedDb.createNewStory).toHaveBeenCalledTimes(1);
    expect(mockedDb.createNewStory).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Draft",
        author: "Ari",
        language: "en",
      })
    );
    expect(state.currentStory?.id).toBe("story-2");
    expect(state.stories).toHaveLength(1);
    expect(state.loading).toBe(false);
  });
});
