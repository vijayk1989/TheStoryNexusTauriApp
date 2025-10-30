/**
 * URL constants for API endpoints and local development servers
 */

export const API_URLS = {
    /** Default local AI API URL (LM Studio compatible) */
    LOCAL_AI_DEFAULT: 'http://localhost:1234/v1',

    /** OpenRouter API base URL */
    OPENROUTER_BASE: 'https://openrouter.ai/api/v1',

    /** Local development server URL (for HTTP-Referer header) */
    DEV_REFERER: 'http://localhost:5173',
} as const;

/**
 * Application route paths
 */
export const ROUTES = {
    HOME: '/',
    STORIES: '/stories',
    AI_SETTINGS: '/ai-settings',
    GUIDE: '/guide',

    /** Dashboard routes - use with storyId parameter */
    DASHBOARD: {
        ROOT: (storyId: string) => `/dashboard/${storyId}`,
        CHAPTERS: (storyId: string) => `/dashboard/${storyId}/chapters`,
        CHAPTER_EDITOR: (storyId: string, chapterId: string) =>
            `/dashboard/${storyId}/chapters/${chapterId}`,
        PROMPTS: (storyId: string) => `/dashboard/${storyId}/prompts`,
        LOREBOOK: (storyId: string) => `/dashboard/${storyId}/lorebook`,
        BRAINSTORM: (storyId: string) => `/dashboard/${storyId}/brainstorm`,
        NOTES: (storyId: string) => `/dashboard/${storyId}/notes`,
    },
} as const;
