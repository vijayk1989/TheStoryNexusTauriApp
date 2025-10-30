import { attempt } from '@jfdi/attempt';
import { logger } from './logger';

export const storageService = {
  get: <T>(key: string, defaultValue: T): T => {
    const [error, item] = attempt(() => {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    });
    return error ? defaultValue : item;
  },

  set: <T>(key: string, value: T): void => {
    const [error] = attempt(() => {
      localStorage.setItem(key, JSON.stringify(value));
    });
    if (error) {
      logger.error(`Failed to save to localStorage: ${key}`, error);
    }
  },

  remove: (key: string): void => {
    const [error] = attempt(() => {
      localStorage.removeItem(key);
    });
    if (error) {
      logger.error(`Failed to remove from localStorage: ${key}`, error);
    }
  },
};

export const STORAGE_KEYS = {
  LAST_EDITED_CHAPTERS: 'lastEditedChapterIds',
} as const;
