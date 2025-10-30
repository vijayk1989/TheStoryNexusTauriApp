/**
 * Standardised logging utility
 */

export const logger = {
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    console.error(`[ERROR] ${message}`, { error, context });
  },

  warn: (message: string, context?: Record<string, unknown>) => {
    console.warn(`[WARN] ${message}`, context);
  },

  info: (message: string, context?: Record<string, unknown>) => {
    console.info(`[INFO] ${message}`, context);
  },

  debug: (message: string, context?: Record<string, unknown>) => {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, context);
    }
  },
};
