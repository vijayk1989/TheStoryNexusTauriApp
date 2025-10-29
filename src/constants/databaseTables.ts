export const DB_TABLES = {
  STORIES: 'stories',
  CHAPTERS: 'chapters',
  AI_CHATS: 'aiChats',
  PROMPTS: 'prompts',
  AI_SETTINGS: 'aiSettings',
  LOREBOOK_ENTRIES: 'lorebookEntries',
  SCENE_BEATS: 'sceneBeats',
  NOTES: 'notes',
} as const;

export type DbTableName = typeof DB_TABLES[keyof typeof DB_TABLES];
