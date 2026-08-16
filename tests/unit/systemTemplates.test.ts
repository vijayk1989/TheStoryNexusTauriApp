import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { SYSTEM_TEMPLATES } from "@/features/templates/defaultTemplates";
import { useTemplateStore } from "@/features/templates/store/templateStore";
import { db } from "@/services/database";
import { seedSystemTemplates } from "@/services/dbSeed";
import type { Template } from "@/types/story";

describe("system templates", () => {
  beforeAll(async () => {
    if (db.isOpen()) db.close();
    await db.delete();
    await db.open();
  });

  afterAll(async () => {
    db.close();
    await db.delete();
  });

  test("seeds and refreshes the built-in Anima template without duplicating it", async () => {
    const definition = SYSTEM_TEMPLATES.find(
      (template) => template.id === "system-image-prompt-anima-natural-language",
    );
    expect(definition).toBeTruthy();

    await seedSystemTemplates();
    const seeded = await db.templates.get(definition!.id);

    expect(seeded).toMatchObject({
      ...definition,
      storyId: null,
      isSystem: true,
    });

    await db.templates.update(definition!.id, { content: "outdated content" });
    await seedSystemTemplates();

    expect((await db.templates.get(definition!.id))?.content).toBe(definition!.content);
    expect(await db.templates.where("id").equals(definition!.id).count()).toBe(1);
  });

  test("protects system templates and excludes them from user exports", async () => {
    const systemTemplate = SYSTEM_TEMPLATES[0];
    await seedSystemTemplates();

    const userTemplate: Template = {
      id: "user-template",
      name: "My template",
      content: "Write something useful.",
      templateType: "chat",
      storyId: null,
      isSystem: false,
      createdAt: new Date(),
    };
    await db.templates.put(userTemplate);

    const store = useTemplateStore.getState();
    await expect(store.updateTemplate(systemTemplate.id, { name: "Changed" })).rejects.toThrow(
      "System templates cannot be edited",
    );
    await expect(store.deleteTemplate(systemTemplate.id)).rejects.toThrow(
      "System templates cannot be deleted",
    );

    expect((await store.exportTemplates()).map((template) => template.id)).toEqual([userTemplate.id]);
    expect(await db.templates.get(systemTemplate.id)).toBeTruthy();
  });
});
