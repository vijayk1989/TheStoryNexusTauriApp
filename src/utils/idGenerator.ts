export const generateId = (): string => crypto.randomUUID();

export const generateStoryId = (): string => generateId();
export const generateChapterId = (): string => generateId();
export const generateLorebookEntryId = (): string => generateId();
export const generateChatId = (): string => generateId();
export const generateNoteId = (): string => generateId();
export const generatePromptId = (): string => generateId();
