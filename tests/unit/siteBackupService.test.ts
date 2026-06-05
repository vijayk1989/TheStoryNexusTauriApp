import { beforeEach, describe, expect, test } from "vitest";

import { db } from "@/services/database";
import { createSiteBackupPayload, siteBackupService } from "@/services/siteBackupService";
import type { AgentPreset, PipelinePreset } from "@/types/story";
import { resetTestDb } from "./testDb";

describe("siteBackupService", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  test("exports written content while excluding API settings and image bytes", async () => {
    await seedBackupGraph();

    const { backup, summary } = await createSiteBackupPayload();
    const serialized = JSON.stringify(backup);

    expect(summary).toMatchObject({
      stories: 1,
      chapters: 1,
      lorebookEntries: 2,
      sceneBeats: 1,
      drafts: 1,
      aiChats: 1,
      notes: 1,
      prompts: 1,
      agentPresets: 1,
      pipelinePresets: 1,
      pipelineExecutions: 1,
      skippedImages: 1,
    });
    expect(serialized).not.toContain("should-not-export");
    expect(serialized).not.toContain("mediaBlobs");
    expect(backup.data.prompts.every((prompt) => !prompt.isSystem)).toBe(true);
    expect(backup.data.pipelinePresets.every((pipeline) => !pipeline.isSystem)).toBe(true);
  });

  test("imports as new content, remaps references, and preserves AI settings on delete", async () => {
    await seedBackupGraph();
    const { backup } = await createSiteBackupPayload();

    await siteBackupService.deleteAllUserContent();

    expect((await db.aiSettings.get("unit-settings"))?.openaiKey).toBe("should-not-export");
    expect(await db.prompts.get("scene-beat-system")).toBeTruthy();
    expect(await db.stories.count()).toBe(0);

    const result = await siteBackupService.importSiteBackup(JSON.stringify(backup));
    const importedStoryId = result.importedStoryIds[0];
    const importedStory = await db.stories.get(importedStoryId);
    const importedChapter = await db.chapters.where("storyId").equals(importedStoryId).first();
    const importedLore = await db.lorebookEntries
      .where("storyId")
      .equals(importedStoryId)
      .and((entry) => entry.name === "Unit Lore")
      .first();
    const importedPrompt = await db.prompts.where("name").equals("Unit Prompt (Imported)").first();
    const importedAgent = await db.agentPresets.where("name").equals("Unit Agent (Imported)").first();
    const importedPipeline = await db.pipelinePresets.where("name").equals("Unit Pipeline (Imported)").first();
    const importedExecution = await db.pipelineExecutions.where("storyId").equals(importedStoryId).first();
    const importedDraft = await db.drafts.where("storyId").equals(importedStoryId).first();

    expect(result.stories).toBe(1);
    expect(importedStory).toMatchObject({
      title: "Unit Story (Imported)",
      author: "Unit",
    });
    expect(importedStory?.id).not.toBe("unit-story");
    expect(importedChapter?.storyId).toBe(importedStoryId);
    expect(importedLore?.metadata?.relationships?.[0]?.targetId).not.toBe("unit-related-lore");
    expect(importedPipeline?.steps[0]?.agentPresetId).toBe(importedAgent?.id);
    expect(importedAgent?.id).not.toBe("unit-agent");
    expect(importedExecution?.pipelinePresetId).toBe(importedPipeline?.id);
    expect(importedPipeline?.id).not.toBe("unit-pipeline");
    expect(importedDraft?.promptId).toBe(importedPrompt?.id);
    expect(importedPrompt?.id).not.toBe("unit-prompt");
    expect(await db.mediaAssets.count()).toBe(0);
  });
});

async function seedBackupGraph(): Promise<void> {
  const storyId = "unit-story";
  const chapterId = "unit-chapter";
  const promptId = "unit-prompt";
  const agentId = "unit-agent";
  const pipelineId = "unit-pipeline";

  const agent: AgentPreset = {
    id: agentId,
    createdAt: new Date(),
    name: "Unit Agent",
    role: "prose_writer",
    model: { id: "local", name: "local", provider: "local" },
    systemPrompt: "Write.",
    temperature: 0.7,
    maxTokens: 256,
    isSystem: false,
    storyId,
  };
  const pipeline: PipelinePreset = {
    id: pipelineId,
    createdAt: new Date(),
    name: "Unit Pipeline",
    steps: [{ agentPresetId: agentId, order: 1, streamOutput: true }],
    isSystem: false,
    storyId,
  };

  await db.aiSettings.add({
    id: "unit-settings",
    createdAt: new Date(),
    openaiKey: "should-not-export",
    availableModels: [],
    lastModelsFetch: new Date(),
  });

  await db.transaction(
    "rw",
    [
      db.stories,
      db.chapters,
      db.lorebookEntries,
      db.sceneBeats,
      db.drafts,
      db.aiChats,
      db.notes,
      db.prompts,
      db.agentPresets,
      db.pipelinePresets,
      db.pipelineExecutions,
      db.mediaAssets,
    ],
    async () => {
      await db.stories.add({
        id: storyId,
        createdAt: new Date(),
        title: "Unit Story",
        author: "Unit",
        language: "English",
      });
      await db.chapters.add({
        id: chapterId,
        createdAt: new Date(),
        storyId,
        title: "Unit Chapter",
        order: 1,
        content: JSON.stringify({
          root: {
            type: "root",
            children: [{ type: "paragraph", children: [{ type: "text", text: "Backup prose." }] }],
          },
        }),
        wordCount: 2,
      });
      await db.lorebookEntries.bulkAdd([
        {
          id: "unit-lore",
          createdAt: new Date(),
          storyId,
          name: "Unit Lore",
          description: "Lore entry",
          category: "character",
          tags: ["unit-lore"],
          metadata: {
            relationships: [{ targetId: "unit-related-lore", type: "knows" }],
          },
        },
        {
          id: "unit-related-lore",
          createdAt: new Date(),
          storyId,
          name: "Unit Related Lore",
          description: "Related lore entry",
          category: "character",
          tags: ["unit-related-lore"],
        },
      ]);
      await db.sceneBeats.add({
        id: "unit-scene-beat",
        createdAt: new Date(),
        storyId,
        chapterId,
        command: "Write the backup scene.",
      });
      await db.drafts.add({
        id: "unit-draft",
        createdAt: new Date(),
        storyId,
        chapterId,
        name: "Unit Draft",
        content: "Draft content",
        promptId,
        wordCount: 2,
      });
      await db.aiChats.add({
        id: "unit-chat",
        createdAt: new Date(),
        storyId,
        chapterId,
        title: "Unit Chat",
        messages: [{ id: "unit-message", role: "user", content: "Hello", timestamp: new Date() }],
      });
      await db.notes.add({
        id: "unit-note",
        createdAt: new Date(),
        updatedAt: new Date(),
        storyId,
        title: "Unit Note",
        content: "Note content",
        type: "idea",
      });
      await db.prompts.add({
        id: promptId,
        createdAt: new Date(),
        name: "Unit Prompt",
        promptType: "other",
        messages: [{ role: "user", content: "Prompt content" }],
        allowedModels: [],
        isSystem: false,
      });
      await db.agentPresets.add(agent);
      await db.pipelinePresets.add(pipeline);
      await db.pipelineExecutions.add({
        id: "unit-pipeline-execution",
        createdAt: new Date(),
        storyId,
        chapterId,
        pipelinePresetId: pipelineId,
        pipelineName: pipeline.name,
        input: "{}",
        results: [],
        finalOutput: "Done",
        totalDuration: 1,
        status: "completed",
      });
      await db.mediaAssets.add({
        id: "unit-image",
        createdAt: new Date(),
        storyId,
        chapterId,
        kind: "generated",
        mimeType: "image/png",
        filename: "unit-image.png",
        storageBackend: "indexeddb_blob",
        storageKey: "unit-image",
        sizeBytes: 1,
        source: "upload",
      });
    }
  );
}
