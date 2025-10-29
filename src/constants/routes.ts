export const ROUTES = {
  HOME: '/',
  STORIES: '/stories',
  AI_SETTINGS: '/ai-settings',
  GUIDE: '/guide',
  DASHBOARD: {
    BASE: (storyId: string) => `/dashboard/${storyId}`,
    CHAPTERS: (storyId: string) => `/dashboard/${storyId}/chapters`,
    CHAPTER_EDITOR: (storyId: string, chapterId: string) =>
      `/dashboard/${storyId}/chapters/${chapterId}`,
    PROMPTS: (storyId: string) => `/dashboard/${storyId}/prompts`,
    LOREBOOK: (storyId: string) => `/dashboard/${storyId}/lorebook`,
    BRAINSTORM: (storyId: string) => `/dashboard/${storyId}/brainstorm`,
    NOTES: (storyId: string) => `/dashboard/${storyId}/notes`,
  }
} as const;

export const ROUTE_PATTERNS = {
  DASHBOARD_BASE: '/dashboard/:storyId',
  CHAPTERS: '/dashboard/:storyId/chapters',
  CHAPTER_EDITOR: '/dashboard/:storyId/chapters/:chapterId',
  PROMPTS: '/dashboard/:storyId/prompts',
  LOREBOOK: '/dashboard/:storyId/lorebook',
  BRAINSTORM: '/dashboard/:storyId/brainstorm',
  NOTES: '/dashboard/:storyId/notes',
} as const;
