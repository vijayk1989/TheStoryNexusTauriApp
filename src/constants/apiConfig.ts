export const API_CONFIG = {
  LOCAL_DEFAULT_URL: import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:1234/v1',
  LOCAL_DEFAULT_PORT: 1234,
  OPENAI_BASE_URL: 'https://api.openai.com/v1',
  OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
} as const;
