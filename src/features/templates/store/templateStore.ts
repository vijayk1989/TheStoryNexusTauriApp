import { create } from 'zustand';
import { db } from '@/services/database';
import type { Template } from '@/types/story';

interface TemplateStore {
  templates: Template[];
  isLoading: boolean;
  error: string | null;

  fetchTemplates: () => Promise<void>;
  createTemplate: (data: Omit<Template, 'id' | 'createdAt'>) => Promise<void>;
  updateTemplate: (id: string, data: Partial<Template>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  exportTemplates: () => Promise<Template[]>;
  importTemplates: (data: Partial<Template>[]) => Promise<{ created: number; skipped: number }>;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: [],
  isLoading: false,
  error: null,

  fetchTemplates: async () => {
    set({ isLoading: true });
    try {
      const templates = await db.templates.toArray();
      set({ templates, error: null });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  createTemplate: async (data) => {
    try {
      // basic validation
      if (!data.name || !data.content) throw new Error('Name and content are required');

      const id = crypto.randomUUID();
      const template: Template = {
        ...data,
        id,
        createdAt: new Date()
      } as Template;

      await db.templates.add(template);
      const templates = await db.templates.toArray();
      set({ templates, error: null });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateTemplate: async (id, data) => {
    try {
      await db.templates.update(id, data);
      const templates = await db.templates.toArray();
      set({ templates, error: null });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteTemplate: async (id) => {
    try {
      await db.templates.delete(id);
      const templates = await db.templates.toArray();
      set({ templates, error: null });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  exportTemplates: async () => {
    return await db.templates.toArray();
  },

  importTemplates: async (data) => {
    const existing = await db.templates.toArray();
    const existingNames = new Set(existing.map(t => t.name.toLowerCase()));
    let created = 0;
    let skipped = 0;
    for (const item of data) {
      if (!item.name || !item.content) { skipped++; continue; }
      if (existingNames.has(item.name.toLowerCase())) { skipped++; continue; }
      await db.templates.add({
        id: crypto.randomUUID(),
        name: item.name,
        content: item.content,
        templateType: item.templateType || 'chat',
        storyId: item.storyId ?? null,
        isSystem: false,
        createdAt: new Date(),
      } as Template);
      existingNames.add(item.name.toLowerCase());
      created++;
    }
    const templates = await db.templates.toArray();
    set({ templates, error: null });
    return { created, skipped };
  },
}))

export default useTemplateStore;
