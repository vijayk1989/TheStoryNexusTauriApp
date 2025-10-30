# Code Review & Refactoring Plan

**Date**: 2025-10-29
**Codebase**: The Story Nexus Tauri App
**Files Analyzed**: 35+ across services, stores, components, pages

---

## Executive Summary

Comprehensive code review identified **39 issues** across code style, DRY violations, hardcoded strings, and architecture:
- **4 Critical** severity issues
- **12 High** severity issues
- **15 Medium** severity issues
- **8 Low** severity issues

**Estimated Impact**:
- Code reduction: ~800 lines via DRY improvements
- Maintainability: 35+ hardcoded strings → typed constants
- Type safety: Routes, DB tables, categories all typed
- Error handling: 193 try-catch → consistent @jfdi/attempt pattern

---

## Phase 1: Constants & Utilities (Foundation)
**Priority**: Critical | **Effort**: Low | **Impact**: High

### 1.1 Create Constants Directory

Create `src/constants/` with centralized constants:

#### `src/constants/errorMessages.ts`
```typescript
export const ERROR_MESSAGES = {
  FETCH_FAILED: (entity: string) => `Failed to fetch ${entity}`,
  CREATE_FAILED: (entity: string) => `Failed to create ${entity}`,
  UPDATE_FAILED: (entity: string) => `Failed to update ${entity}`,
  DELETE_FAILED: (entity: string) => `Failed to delete ${entity}`,
  NOT_FOUND: (entity: string) => `${entity} not found`,
} as const;
```

**Replaces**: 35+ scattered error message strings across all stores

---

#### `src/constants/routes.ts`
```typescript
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
```

**Replaces**: 10+ hardcoded route strings in navigation components

---

#### `src/constants/databaseTables.ts`
```typescript
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
```

**Replaces**: Magic strings in database.ts and 35+ store queries

---

#### `src/constants/lorebookCategories.ts`
```typescript
export const LOREBOOK_CATEGORIES = {
  CHARACTER: 'character',
  LOCATION: 'location',
  ITEM: 'item',
  EVENT: 'event',
  NOTE: 'note',
  SYNOPSIS: 'synopsis',
  STARTING_SCENARIO: 'starting scenario',
  TIMELINE: 'timeline',
} as const;

export type LorebookCategory = typeof LOREBOOK_CATEGORIES[keyof typeof LOREBOOK_CATEGORIES];

export const LOREBOOK_CATEGORY_LIST = Object.values(LOREBOOK_CATEGORIES);
```

**Replaces**: Repeated category strings across lorebook components

---

#### `src/constants/apiConfig.ts`
```typescript
export const API_CONFIG = {
  LOCAL_DEFAULT_URL: import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:1234/v1',
  LOCAL_DEFAULT_PORT: 1234,
  OPENAI_BASE_URL: 'https://api.openai.com/v1',
  OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
} as const;
```

**Replaces**: Hardcoded URLs in AIService.ts, AIProviderFactory.ts, documentation

---

### 1.2 Create Utility Functions

#### `src/utils/idGenerator.ts`
```typescript
export const generateId = (): string => crypto.randomUUID();

export const generateStoryId = (): string => generateId();
export const generateChapterId = (): string => generateId();
export const generateLorebookEntryId = (): string => generateId();
export const generateChatId = (): string => generateId();
export const generateNoteId = (): string => generateId();
export const generatePromptId = (): string => generateId();
```

**Replaces**: 15+ scattered `crypto.randomUUID()` calls

---

#### `src/utils/errorUtils.ts`
```typescript
export const formatError = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export const isError = (e: unknown): e is Error => e instanceof Error;

export const getErrorMessage = (error: unknown): string =>
  isError(error) ? error.message : String(error);
```

**Replaces**: 35+ `error instanceof Error ? error.message : 'fallback'` patterns

---

#### `src/utils/storageService.ts`
```typescript
export const storageService = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save to localStorage: ${key}`, error);
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove from localStorage: ${key}`, error);
    }
  },
};

export const STORAGE_KEYS = {
  LAST_EDITED_CHAPTERS: 'lastEditedChapterIds',
} as const;
```

**Replaces**: Direct localStorage access in useChapterDataStore.ts (lines 33, 121, 198)

---

## Phase 5: Error Handling Compliance

**Priority**: High | **Effort**: High | **Impact**: High

### 5.1 Replace try/catch with @jfdi/attempt

**Problem**: 38 files contain try/catch blocks violating CLAUDE.md error handling guidelines

**Guideline**: Use functional error handling with `@jfdi/attempt` library

#### Files requiring refactoring

**Core Services (Priority 1)**:

- `src/services/ai/AIService.ts`
- `src/services/ai/providers/OpenAIProvider.ts`
- `src/services/ai/providers/OpenRouterProvider.ts`
- `src/services/ai/providers/LocalAIProvider.ts`
- `src/services/ai/StreamProcessor.ts`
- `src/services/storyExportService.ts`

**Feature Services (Priority 2)**:

- `src/features/prompts/services/promptParser.ts` ✅ (completed)
- `src/features/prompts/services/resolvers/ChapterResolvers.ts`
- `src/features/prompts/services/resolvers/BrainstormResolvers.ts`
- `src/features/prompts/services/resolvers/VariableResolverRegistry.ts`
- `src/features/lorebook/stores/LorebookImportExportService.ts`

**Stores (Priority 3)**:

- `src/features/chapters/stores/useChapterContentStore.ts`
- All other stores with try/catch blocks

**Components (Priority 4 - only where recoverable errors exist)**:

- Review each try/catch for necessity
- Remove where global error boundary can handle
- Keep only for truly recoverable errors

#### Refactoring pattern

**Before**:

```typescript
async someMethod(): Promise<Result> {
  try {
    const data = await fetchData();
    return processData(data);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

**After**:

```typescript
import { attemptPromise } from '@jfdi/attempt';

async someMethod(): Promise<Result> {
  const [error, data] = await attemptPromise(() => fetchData());
  if (error) throw error;

  return processData(data);
}
```

**For methods that return error objects**:

```typescript
async parse(config: Config): Promise<ParsedResult> {
  const [error, data] = await attemptPromise(() => fetchData());

  if (error || !data) {
    return {
      result: null,
      error: error?.message || 'Data not found'
    };
  }

  // Continue processing...
}
```

#### Guidelines

1. Only add error handling where recoverable errors likely
2. Unhandled exceptions fall back to global error boundary
3. Use functional style with `attempt`/`attemptPromise`
4. Avoid defensive try/catch blocks around every operation
5. Let errors bubble up unless specific recovery logic exists

---

## Phase 2: DRY Violations (Core Logic)
**Priority**: Critical | **Effort**: Medium | **Impact**: High

### 2.1 Refactor AI Generation Duplication

**File**: `src/features/ai/stores/useAIStore.ts`

**Problem**: Lines 132-254 contain massive duplication in `generateWithPrompt` and `generateWithParsedMessages`

#### Create shared types:
```typescript
// src/features/ai/types/generationParams.ts
export interface GenerationParams {
  temperature?: number;
  maxTokens?: number;
  top_p?: number;
  top_k?: number;
  repetition_penalty?: number;
  min_p?: number;
}
```

#### Extract provider switching logic:
```typescript
// src/features/ai/services/aiGenerationHelper.ts
import type { AIProvider } from '@/types/ai';
import type { GenerationParams } from '../types/generationParams';
import { aiService } from '@/services/ai/AIService';

export const generateWithProvider = (
  provider: AIProvider,
  messages: Array<{ role: string; content: string }>,
  modelId: string,
  params: GenerationParams
): Promise<Response> => {
  const { temperature, maxTokens, top_p, top_k, repetition_penalty, min_p } = params;

  switch (provider) {
    case 'local':
      return aiService.generateWithLocalModel(
        messages, modelId, temperature, maxTokens,
        top_p, top_k, repetition_penalty, min_p
      );
    case 'openai':
      return aiService.generateWithOpenAI(
        messages, modelId, temperature, maxTokens
      );
    case 'openrouter':
      return aiService.generateWithOpenRouter(
        messages, modelId, temperature, maxTokens,
        top_p, top_k, repetition_penalty, min_p
      );
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
};
```

**Impact**: Eliminates ~120 lines of duplication

---

### 2.2 Refactor Stream Formatting Duplication

**File**: `src/services/ai/AIService.ts`

**Problem**: Lines 177-209 and 249-277 contain identical stream formatting logic

#### Create shared method:
```typescript
// Add to AIService class
private formatStreamAsSSE(response: Response): Response {
  const responseStream = new ReadableStream({
    async start(controller) {
      if (!response.body) {
        controller.close();
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const content = decoder.decode(value, { stream: true });
          const formattedChunk = `data: ${JSON.stringify({
            choices: [{ delta: { content } }]
          })}\n\n`;

          controller.enqueue(new TextEncoder().encode(formattedChunk));
        }
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });

  return new Response(responseStream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

**Then refactor both methods**:
```typescript
async generateWithOpenAI(/* params */): Promise<Response> {
  // ... existing validation and request code ...
  const response = await fetch(/* ... */);
  return this.formatStreamAsSSE(response);
}

async generateWithOpenRouter(/* params */): Promise<Response> {
  // ... existing validation and request code ...
  const response = await fetch(/* ... */);
  return this.formatStreamAsSSE(response);
}
```

**Impact**: Eliminates ~60 lines of duplication

---

### 2.3 Create Generic Database Query Helpers

**File**: `src/utils/databaseHelpers.ts`

```typescript
import { attemptPromise } from '@jfdi/attempt';

interface FetchAndSetOptions<T> {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setData: (data: T) => void;
}

export const fetchAndSet = async <T>(
  query: () => Promise<T>,
  options: FetchAndSetOptions<T>
): Promise<void> => {
  const { setLoading, setError, setData } = options;

  setLoading(true);
  setError(null);

  const [error, data] = await attemptPromise(query);

  if (error) {
    setError(error.message);
    setLoading(false);
    return;
  }

  setData(data);
  setLoading(false);
};

// Usage example in stores:
export const useStoryStore = create<StoryStore>((set, get) => ({
  stories: [],
  loading: false,
  error: null,

  fetchStories: async () => {
    await fetchAndSet(
      () => db.stories.toArray(),
      {
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        setData: (stories) => set({ stories }),
      }
    );
  },
}));
```

**Replaces**: 15+ repeated database query patterns across all stores

---

### 2.4 Refactor Lorebook Store Getters

**File**: `src/features/lorebook/stores/useLorebookStore.ts`

**Problem**: Lines 122-210 repeat same pattern 12 times

```typescript
const createLorebookGetter = <T>(
  filterMethod: (entries: LorebookEntry[]) => T
) => (): T => {
  const entries = useLorebookDataStore.getState().entries;
  return filterMethod(entries);
};

// Then use it:
getAllCharacters: createLorebookGetter(LorebookFilterService.getAllCharacters),
getAllLocations: createLorebookGetter(LorebookFilterService.getAllLocations),
getAllItems: createLorebookGetter(LorebookFilterService.getAllItems),
getAllEvents: createLorebookGetter(LorebookFilterService.getAllEvents),
getAllNotes: createLorebookGetter(LorebookFilterService.getAllNotes),
getAllSynopses: createLorebookGetter(LorebookFilterService.getAllSynopses),
getAllStartingScenarios: createLorebookGetter(LorebookFilterService.getAllStartingScenarios),
getAllTimelines: createLorebookGetter(LorebookFilterService.getAllTimelines),
getAllOtherNotes: createLorebookGetter(LorebookFilterService.getAllOtherNotes),
getActiveEntries: createLorebookGetter(LorebookFilterService.getActiveEntries),
getDisabledEntries: createLorebookGetter(LorebookFilterService.getDisabledEntries),
getEntriesByCategory: (category: string) => {
  const entries = useLorebookDataStore.getState().entries;
  return LorebookFilterService.getEntriesByCategory(entries, category);
},
```

**Impact**: Reduces ~50 lines to ~15 lines

---

### 2.5 Refactor Chapter Summary Formatting

**File**: `src/features/chapters/stores/useChapterMetadataStore.ts`

**Problem**: Lines 77-85 and 115-122 nearly identical

```typescript
// src/utils/chapterFormatters.ts
export const formatChapterSummary = (
  chapter: Chapter,
  delimiter: string,
  includeNewlines: boolean = false
): string => {
  const summary = chapter.summary?.trim();
  if (!summary) return '';

  const separator = includeNewlines ? ':\n' : ': ';
  return `Chapter ${chapter.order} - ${chapter.title}${separator}${summary}`;
};

export const formatChapterSummaries = (
  chapters: Chapter[],
  delimiter: string,
  includeNewlines: boolean = false
): string => {
  return chapters
    .map(chapter => formatChapterSummary(chapter, delimiter, includeNewlines))
    .filter(Boolean)
    .join(delimiter);
};

// Then use in store:
getChapterSummaries: (chapterId: string) => {
  // ... get chapters ...
  return formatChapterSummaries(chapters, ', ', false);
},

getAllChapterSummaries: () => {
  // ... get chapters ...
  return formatChapterSummaries(chapters, '\n\n', true);
},
```

**Impact**: DRY improvement + reusable utility

---

## Phase 3: Error Handling Pattern
**Priority**: High | **Effort**: Medium | **Impact**: High

### 3.1 Replace try-catch with @jfdi/attempt

**Affected**: All store files (193 try-catch blocks total)

**Example refactor** - `src/features/stories/stores/useStoryStore.ts`:

#### Before (lines 26-42):
```typescript
fetchStories: async () => {
  set({ loading: true, error: null });
  try {
    const stories = await db.stories.toArray();
    set({ stories, loading: false });
  } catch (error) {
    set({
      error: error instanceof Error ? error.message : 'Failed to fetch stories',
      loading: false
    });
  }
},
```

#### After:
```typescript
import { attemptPromise } from '@jfdi/attempt';
import { formatError } from '@/utils/errorUtils';
import { ERROR_MESSAGES } from '@/constants/errorMessages';

fetchStories: async () => {
  set({ loading: true, error: null });

  const [error, stories] = await attemptPromise(() => db.stories.toArray());

  if (error) {
    set({
      error: formatError(error, ERROR_MESSAGES.FETCH_FAILED('stories')),
      loading: false
    });
    return;
  }

  set({ stories, loading: false });
},
```

**Apply to all stores**:
- useStoryStore.ts
- useChapterDataStore.ts
- useChapterContentStore.ts
- useChapterMetadataStore.ts
- useLorebookDataStore.ts
- useBrainstormStore.ts
- useNotesStore.ts
- useSceneBeatStore.ts
- promptStore.ts
- useAIStore.ts

**Impact**: Consistent error handling pattern across entire codebase

---

### 3.2 Add React Error Boundary

**File**: `src/components/ErrorBoundary.tsx`

```typescript
import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Integrate in** `src/main.tsx`:
```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
```

---

## Phase 4: Code Style Compliance
**Priority**: High | **Effort**: Medium | **Impact**: Medium

### 4.1 Replace `let` with `const`

**Affected files** (20+ files):
- `src/features/chapters/stores/useChapterContentStore.ts`
- `src/features/prompts/services/promptParser.ts`
- `src/features/brainstorm/components/ChatInterface.tsx`
- `src/Lexical/lexical-playground/src/plugins/FloatingTextFormatToolbarPlugin/index.tsx`

**Examples**:

#### `promptParser.ts` (line 119)
**Before**:
```typescript
let parsedContent = content.replace(/\/\*[\s\S]*?\*\//g, '');
```

**After**:
```typescript
const parsedContent = content.replace(/\/\*[\s\S]*?\*\//g, '');
```

#### `ChatInterface.tsx` (retry logic)
**Before**:
```typescript
let attempt = 0;
while (attempt < maxRetries) {
  attempt += 1;
  // ...
}
```

**After**:
```typescript
const retry = async (maxAttempts: number): Promise<void> => {
  const attempts = Array.from({ length: maxAttempts }, (_, i) => i);

  for (const attemptIndex of attempts) {
    const [error, result] = await attemptPromise(operation);
    if (!error) return result;
    if (attemptIndex === maxAttempts - 1) throw error;
  }
};
```

**Apply functional patterns**: Use map/reduce/filter instead of imperative loops with `let`

---

### 4.2 Fix Explicit `any` Types (Type Safety)

**Total occurrences**: 20+ explicit `any` types that should be properly typed

#### 4.2.1 Lexical Editor Node Types (Critical)

**Files**:
- `src/utils/exportUtils.ts` (lines 20, 27, 34, 39, 45, 151, 241)
- `src/features/chapters/stores/useChapterContentStore.ts` (line 51)

**Problem**: Lexical nodes typed as `any`

**Before**:
```typescript
const processNode = (node: any, parentElement: HTMLElement) => {
  if (node.type === 'text') {
    // ...
  }
}
```

**After**:
```typescript
interface SerializedLexicalNode {
  type: string;
  text?: string;
  children?: SerializedLexicalNode[];
  tag?: string;
  version: number;
}

const processNode = (node: SerializedLexicalNode, parentElement: HTMLElement) => {
  if (node.type === 'text') {
    // ...
  }
}
```

---

#### 4.2.2 Chat Messages Array Type

**File**: `src/features/brainstorm/stores/useBrainstormStore.ts` (lines 15, 51, 175, 195)

**Problem**: Messages typed as `any[]` when `ChatMessage` type exists

**Before**:
```typescript
addChat: (storyId: string, title: string, messages: any[]) => Promise<string>;
// ...
.map((msg: any) => ...)
.find((m: any) => ...)
```

**After**:
```typescript
import type { ChatMessage } from '@/types/story';

addChat: (storyId: string, title: string, messages: ChatMessage[]) => Promise<string>;
// ...
.map((msg: ChatMessage) => ...)
.find((m: ChatMessage) => ...)
```

---

#### 4.2.3 Prompt Component Props

**File**: `src/features/brainstorm/components/MessageInputArea.tsx` (line 9)

**Before**:
```typescript
selectedPrompt: any;
```

**After**:
```typescript
import type { Prompt } from '@/types/story';

selectedPrompt: Prompt | null;
```

---

#### 4.2.4 Message Update Parameters

**File**: `src/features/brainstorm/stores/useBrainstormStore.ts` (line 23)

**Before**:
```typescript
updateMessage: (chatId: string, messageId: string, updates: Partial<any>) => Promise<void>;
```

**After**:
```typescript
updateMessage: (chatId: string, messageId: string, updates: Partial<ChatMessage>) => Promise<void>;
```

---

#### 4.2.5 OpenRouter API Response

**File**: `src/services/ai/providers/OpenRouterProvider.ts` (line 38)

**Before**:
```typescript
const models: AIModel[] = result.data.map((model: any) => ({
  id: model.id,
  name: model.name,
}));
```

**After**:
```typescript
interface OpenRouterModelResponse {
  id: string;
  name: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

const models: AIModel[] = result.data.map((model: OpenRouterModelResponse) => ({
  id: model.id,
  name: model.name,
}));
```

---

#### 4.2.6 Database Migration Filter

**File**: `src/services/database.ts` (line 56)

**Before**:
```typescript
(m: any) => m.id === 'local' && m.name === 'local'
```

**After**:
```typescript
import type { AllowedModel } from '@/types/story';

(m: AllowedModel) => m.id === 'local' && m.name === 'local'
```

---

#### 4.2.7 Lexical Playground Plugins

**Files**:
- `src/Lexical/lexical-playground/src/plugins/FloatingTextFormatToolbarPlugin/index.tsx` (lines 238, 310)
- `src/Lexical/lexical-playground/src/plugins/TestRecorderPlugin/index.tsx` (line 153)

**Before**:
```typescript
const traverseNodes = (node: any): boolean => { /* ... */ };
let selection: any = null;
```

**After**:
```typescript
import type { LexicalNode, RangeSelection } from 'lexical';

const traverseNodes = (node: LexicalNode): boolean => { /* ... */ };
let selection: RangeSelection | null = null;
```

---

#### 4.2.8 Replace `Record<string, any>` with `unknown`

**Files**:
- `src/types/story.ts` (lines 53, 167, 190)

**Before**:
```typescript
metadata?: {
  useMatchedChapter?: boolean;
  useMatchedSceneBeat?: boolean;
  useCustomContext?: boolean;
  [key: string]: any; // Too permissive
};

additionalContext?: Record<string, any>;
```

**After**:
```typescript
metadata?: {
  useMatchedChapter?: boolean;
  useMatchedSceneBeat?: boolean;
  useCustomContext?: boolean;
  [key: string]: unknown; // Require type guards
};

additionalContext?: Record<string, unknown>;

// Then use type guards when accessing:
if (typeof context.someKey === 'string') {
  // use it safely
}
```

**Create type guards**:
```typescript
// src/utils/typeGuards.ts
export const isValidMetadataValue = (value: unknown): value is boolean | string | number =>
  typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number';
```

---

### 4.3 Refactor Classes to Functions

#### Refactor `PromptParser` to Functional Service

**File**: `src/features/prompts/services/promptParser.ts`

**Before**:
```typescript
export class PromptParser {
  parse(template: string, variables: Record<string, any>): string {
    // ...
  }
}
```

**After**:
```typescript
export const parsePrompt = (
  template: string,
  variables: Record<string, any>
): string => {
  // ... same logic as functional code
};

export const parsePromptWithContext = (
  template: string,
  context: PromptContext
): string => {
  const variables = buildVariables(context);
  return parsePrompt(template, variables);
};
```

#### Refactor `StreamProcessor` to Functional Utilities

**File**: `src/services/ai/StreamProcessor.ts`

Convert class methods to standalone functions accepting callbacks.

---

### 4.3 Document Class Exceptions

**File**: `CLAUDE.md` - Add section:

```markdown
### Architectural Exceptions to Functional Programming

The following classes are justified exceptions to the functional programming preference:

1. **StoryDatabase (Dexie)** - Required by Dexie.js library architecture
2. **AIService (Singleton)** - Manages stateful API client instances and initialization
3. **AIProviderFactory** - Factory pattern for provider-specific client creation

All other services should use functional patterns.
```

---

## Phase 5: Architecture Improvements
**Priority**: Medium | **Effort**: Medium | **Impact**: Medium

### 5.1 Standardize Store Architecture

**Document pattern** in `docs/ARCHITECTURE.md`:

```markdown
## Store Architecture Patterns

### Direct Database Access Pattern
Use for simple CRUD operations on single entities:
- useStoryStore
- useBrainstormStore
- useNotesStore

Example:
```typescript
export const useStoryStore = create<StoryStore>((set) => ({
  stories: [],
  fetchStories: async () => {
    const [error, stories] = await attemptPromise(() => db.stories.toArray());
    // ...
  },
}));
```

### Facade Store Pattern
Use for complex entities requiring coordination between multiple concerns:
- useChapterStore (coordinates data + content + metadata)
- useLorebookStore (coordinates data + filtering + matching)

Example:
```typescript
export const useChapterStore = create<ChapterStore>(() => ({
  // Delegate to specialized sub-stores
  get chapters() {
    return useChapterDataStore.getState().chapters;
  },
  get content() {
    return useChapterContentStore.getState().content;
  },
}));
```

### When to Use Each Pattern
- **Direct Access**: Single responsibility, straightforward CRUD
- **Facade**: Multiple related concerns, complex coordination, shared state
```

---

### 5.2 Fix Cross-Store Getter Coupling

**File**: `src/features/chapters/stores/useChapterStore.ts`

**Problem**: Lines 48-65 create tight coupling via `getState()` calls

**Before**:
```typescript
get chapters() {
  return useChapterDataStore.getState().chapters;
},
```

**After** - Use proper Zustand subscription:
```typescript
// Remove getters, use selectors in components instead:

// In component:
const chapters = useChapterDataStore(state => state.chapters);
const content = useChapterContentStore(state => state.content);
```

Or if facade is truly needed:
```typescript
// Create proper facade with subscriptions
export const useChapterStore = () => {
  const chapters = useChapterDataStore(state => state.chapters);
  const content = useChapterContentStore(state => state.content);
  const metadata = useChapterMetadataStore(state => state.metadata);

  return { chapters, content, metadata };
};
```

---

### 5.3 Refactor PromptParser Special Cases

**File**: `src/features/prompts/services/promptParser.ts`

**Problem**: Lines 136-186 contain business logic for variable interactions

**Solution**: Create resolver pattern

```typescript
// src/features/prompts/services/variableResolvers.ts
export interface VariableResolver {
  canResolve: (variableName: string, context: PromptContext) => boolean;
  resolve: (variableName: string, context: PromptContext) => string;
}

export const matchedEntriesResolver: VariableResolver = {
  canResolve: (name) =>
    name === 'matched_entries_chapter' ||
    name === 'lorebook_chapter_matched_entries',

  resolve: (name, context) => {
    const useSceneBeat = context.variables?.additional_scenebeat_context === 'true';
    return useSceneBeat
      ? context.sceneBeatMatchedEntries
      : context.chapterMatchedEntries;
  },
};

export const variableResolvers: VariableResolver[] = [
  matchedEntriesResolver,
  summariesResolver,
  povResolver,
  // ... more resolvers
];

// Then in parsePrompt:
const resolveVariable = (name: string, context: PromptContext): string => {
  const resolver = variableResolvers.find(r => r.canResolve(name, context));
  return resolver ? resolver.resolve(name, context) : '';
};
```

**Impact**: Separates parsing from resolution, easier to test and extend

---

### 5.4 Improve Optimistic Updates

**File**: `src/features/brainstorm/stores/useBrainstormStore.ts`

**Problem**: Lines 152-186 rollback loses all optimistic state

**Before**:
```typescript
// Optimistically update
set(state => ({
  chats: state.chats.map(chat =>
    chat.id === chatId ? { ...chat, messages: updatedMessages } : chat
  )
}));

try {
  await db.aiChats.update(chatId, { messages: updatedMessages });
} catch (error) {
  // Loses all other optimistic updates!
  const chats = await db.aiChats.toArray();
  set({ chats });
}
```

**After**:
```typescript
// Store previous state for rollback
const previousState = get().chats.find(c => c.id === chatId);

// Optimistically update
set(state => ({
  chats: state.chats.map(chat =>
    chat.id === chatId ? { ...chat, messages: updatedMessages } : chat
  )
}));

const [error] = await attemptPromise(() =>
  db.aiChats.update(chatId, { messages: updatedMessages })
);

if (error && previousState) {
  // Rollback only this specific update
  set(state => ({
    chats: state.chats.map(chat =>
      chat.id === chatId ? previousState : chat
    )
  }));
  // Show error toast
}
```

**Impact**: Precise rollbacks, better UX

---

## Phase 6: Polish
**Priority**: Low | **Effort**: Low | **Impact**: Low

### 6.1 Add Type Guards

**File**: `src/utils/typeGuards.ts`

```typescript
export const isError = (e: unknown): e is Error => e instanceof Error;

export const isDefined = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

export const isString = (value: unknown): value is string =>
  typeof value === 'string';

export const isArray = <T>(value: unknown): value is T[] =>
  Array.isArray(value);
```

**Use throughout codebase** instead of direct `instanceof` checks

---

### 6.2 Add Max Attempts to Loops

**File**: `src/features/prompts/stores/promptStore.ts`

**Before** (line 210):
```typescript
// eslint-disable-next-line no-constant-condition
while (true) {
  const existing = await db.prompts.where('name').equals(newName).first();
  if (!existing) break;
  attempt += 1;
  newName = `${p.name} (Imported${attempt > 1 ? ` ${attempt}` : ''})`;
}
```

**After**:
```typescript
const MAX_IMPORT_ATTEMPTS = 100;
const attempts = Array.from({ length: MAX_IMPORT_ATTEMPTS }, (_, i) => i + 1);

for (const attempt of attempts) {
  newName = attempt === 1
    ? p.name
    : `${p.name} (Imported${attempt > 1 ? ` ${attempt}` : ''})`;

  const existing = await db.prompts.where('name').equals(newName).first();
  if (!existing) break;

  if (attempt === MAX_IMPORT_ATTEMPTS) {
    throw new Error(`Failed to generate unique name after ${MAX_IMPORT_ATTEMPTS} attempts`);
  }
}
```

---

### 6.3 Standardize Logging

**File**: `src/utils/logger.ts`

```typescript
export const logger = {
  error: (message: string, error?: unknown, context?: Record<string, any>) => {
    console.error(`[ERROR] ${message}`, { error, context });
  },

  warn: (message: string, context?: Record<string, any>) => {
    console.warn(`[WARN] ${message}`, context);
  },

  info: (message: string, context?: Record<string, any>) => {
    console.info(`[INFO] ${message}`, context);
  },

  debug: (message: string, context?: Record<string, any>) => {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, context);
    }
  },
};
```

**Replace all** `console.error`, `console.warn`, etc. with `logger.*`

---

### 6.4 Remove Unused State

**File**: `src/features/chapters/stores/useChapterMetadataStore.ts`

**Remove** line 26: `summariesSoFar: ''` (unused)

**Audit all stores** for unused state properties

---

### 6.5 Add SSE Format Constant

**File**: `src/constants/aiConstants.ts`

```typescript
export const SSE_FORMAT = {
  DATA_PREFIX: 'data: ',
  DONE_MESSAGE: 'data: [DONE]\n\n',
  NEWLINE: '\n\n',
} as const;

export const formatSSEChunk = (content: string): string => {
  const data = JSON.stringify({ choices: [{ delta: { content } }] });
  return `${SSE_FORMAT.DATA_PREFIX}${data}${SSE_FORMAT.NEWLINE}`;
};
```

**Use in** AIService stream formatting instead of hardcoded strings

---

## Implementation Checklist

### Phase 1: Constants & Utilities ✓
- [ ] Create `src/constants/errorMessages.ts`
- [ ] Create `src/constants/routes.ts`
- [ ] Create `src/constants/databaseTables.ts`
- [ ] Create `src/constants/lorebookCategories.ts`
- [ ] Create `src/constants/apiConfig.ts`
- [ ] Create `src/utils/idGenerator.ts`
- [ ] Create `src/utils/errorUtils.ts`
- [ ] Create `src/utils/storageService.ts`
- [ ] Update all imports to use new constants
- [ ] Test all affected functionality

### Phase 2: DRY Violations ✓
- [ ] Create `src/features/ai/types/generationParams.ts`
- [ ] Create `src/features/ai/services/aiGenerationHelper.ts`
- [ ] Refactor `useAIStore.ts` to use helper
- [ ] Add `formatStreamAsSSE()` to AIService
- [ ] Refactor OpenAI/OpenRouter methods
- [ ] Create `src/utils/databaseHelpers.ts`
- [ ] Update all stores to use `fetchAndSet`
- [ ] Refactor lorebook store getters
- [ ] Create `src/utils/chapterFormatters.ts`
- [ ] Update chapter metadata store
- [ ] Test all AI generation functionality
- [ ] Test all database operations

### Phase 3: Error Handling ✓
- [ ] Install/verify `@jfdi/attempt` dependency
- [ ] Refactor useStoryStore.ts
- [ ] Refactor useChapterDataStore.ts
- [ ] Refactor useChapterContentStore.ts
- [ ] Refactor useChapterMetadataStore.ts
- [ ] Refactor useLorebookDataStore.ts
- [ ] Refactor useBrainstormStore.ts
- [ ] Refactor useNotesStore.ts
- [ ] Refactor useSceneBeatStore.ts
- [ ] Refactor promptStore.ts
- [ ] Refactor useAIStore.ts
- [ ] Create `src/components/ErrorBoundary.tsx`
- [ ] Integrate ErrorBoundary in main.tsx
- [ ] Test error scenarios in all stores

### Phase 4: Code Style & Type Safety ✓
- [ ] Audit and replace `let` with `const` in 20+ files
- [ ] Refactor PromptParser to functional
- [ ] Refactor StreamProcessor to functional
- [ ] Update CLAUDE.md with class exceptions
- [ ] Fix explicit `any` types (20+ occurrences):
  - [ ] Lexical editor node types in exportUtils.ts (8 occurrences)
  - [ ] Chat messages in useBrainstormStore.ts (use ChatMessage type)
  - [ ] Prompt type in MessageInputArea.tsx
  - [ ] OpenRouter API response types
  - [ ] Database migration filter types
  - [ ] Lexical playground plugin types
  - [ ] Replace Record<string, any> with Record<string, unknown>
- [ ] Run linter/formatter
- [ ] Test refactored services

### Phase 5: Architecture ✓
- [ ] Create `docs/ARCHITECTURE.md`
- [ ] Document store patterns
- [ ] Refactor useChapterStore cross-store coupling
- [ ] Create `src/features/prompts/services/variableResolvers.ts`
- [ ] Refactor PromptParser to use resolvers
- [ ] Improve optimistic update rollback in useBrainstormStore
- [ ] Test all architectural changes

### Phase 6: Polish ✅
- [x] Create `src/utils/typeGuards.ts` (using @sindresorhus/is)
- [x] Add max attempts to import loop (already completed in Phase 5)
- [x] Create `src/utils/logger.ts`
- [x] Replace console.* with logger (key files: promptStore, storageService)
- [x] Remove unused state properties (removed `summariesSoFar` from chapter stores)
- [x] Create `src/constants/aiConstants.ts`
- [x] Update SSE formatting to use constants
- [x] Final testing pass (existing TypeScript errors from previous phases noted)

---

## Testing Strategy

After each phase:

1. **Unit Tests**: Test new utility functions
2. **Integration Tests**: Test refactored stores with database
3. **Manual Testing**:
   - Create/edit/delete stories
   - Create/edit chapters
   - Generate AI content
   - Import/export prompts
   - Manage lorebook entries
   - Chat brainstorming
4. **Regression Tests**: Ensure no functionality broken

---

## Estimated Effort

| Phase | Time Estimate | Priority |
|-------|---------------|----------|
| Phase 1 | 4-6 hours | Critical |
| Phase 2 | 6-8 hours | Critical |
| Phase 3 | 8-10 hours | High |
| Phase 4 | 6-8 hours | High |
| Phase 5 | 6-8 hours | Medium |
| Phase 6 | 4-6 hours | Low |
| **Total** | **34-46 hours** | - |

---

## Success Metrics

- **Code Reduction**: ~800 lines eliminated
- **Constants**: 35+ hardcoded strings → typed constants
- **Error Handling**: 193 try-catch → @jfdi/attempt pattern
- **Type Safety**: All routes, DB tables, categories typed
- **Maintainability**: Single source of truth for all constants
- **Consistency**: Unified patterns across all stores

---

## Notes

- **Backwards Compatibility**: All refactorings maintain existing functionality
- **Incremental**: Each phase can be completed and tested independently
- **Documentation**: Update CLAUDE.md and create ARCHITECTURE.md as we go
- **Git Strategy**: One commit per completed phase with clear description
