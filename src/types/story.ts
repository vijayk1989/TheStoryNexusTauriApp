// Base types for common fields
interface BaseEntity {
    id: string;
    createdAt: Date;
    isDemo?: boolean; // Flag to identify demo content
}

// Core story type
export interface Story extends BaseEntity {
    title: string;
    author: string;
    language: string;
    synopsis?: string;
}

// Chapter structure
export interface Chapter extends BaseEntity {
    storyId: string;
    title: string;
    summary?: string;
    order: number;
    content: string;
    outline?: ChapterOutline;
    wordCount: number;
    povCharacter?: string;
    povType?: 'First Person' | 'Third Person Limited' | 'Third Person Omniscient';
    notes?: ChapterNotes;
}

export interface ChapterOutline {
    content: string;
    lastUpdated: Date;
}

export interface ChapterNotes {
    content: string;
    lastUpdated: Date;
}

// SceneBeat structure
export interface SceneBeat extends BaseEntity {
    storyId: string;
    chapterId: string;
    command: string;
    povType?: 'First Person' | 'Third Person Limited' | 'Third Person Omniscient';
    povCharacter?: string;
    generatedContent?: string; // To store the last generated content
    accepted?: boolean; // Whether the generated content was accepted
    metadata?: {
        useMatchedChapter?: boolean;
        useMatchedSceneBeat?: boolean;
        useCustomContext?: boolean;
        [key: string]: any; // Allow for additional metadata properties
    };
}

// AI Chat types
export interface AIChat extends BaseEntity {
    storyId: string;
    title: string;
    messages: ChatMessage[];
    updatedAt?: Date;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    // Optional edit metadata
    originalContent?: string; // the original content before the first edit
    editedAt?: string; // ISO timestamp when last edited
    editedBy?: string; // who edited it (e.g., 'user')
    edited?: boolean; // convenience flag
}

// Prompt related types
export interface PromptMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AllowedModel {
    id: string;
    provider: AIProvider;
    name: string;
}

export interface Prompt extends BaseEntity {
    name: string;
    description?: string;
    promptType: 'scene_beat' | 'gen_summary' | 'selection_specific' | 'continue_writing' | 'other' | 'brainstorm';
    messages: PromptMessage[];
    allowedModels: AllowedModel[];
    storyId?: string;
    isSystem?: boolean; // Flag to identify system prompts
    temperature?: number;
    maxTokens?: number;
    top_p?: number; // Nucleus sampling: 1.0 means consider all tokens, 0 means disabled
    top_k?: number; // Limit sampling to top k tokens: 50 is default, 0 means disabled
    repetition_penalty?: number; // Penalty for repeating tokens: 1.0 means no penalty, 0 means disabled
    min_p?: number; // Minimum probability for sampling: 0.0 is default, 1.0 means only consider most likely tokens
}

// AI Provider and Model types
export type AIProvider = 'openai' | 'openrouter' | 'local';

export interface AIModel {
    id: string;
    name: string;
    provider: AIProvider;
    contextLength: number;
    enabled: boolean;
}

export interface AISettings extends BaseEntity {
    openaiKey?: string;
    openrouterKey?: string;
    availableModels: AIModel[];
    lastModelsFetch?: Date;
    localApiUrl?: string;
    defaultLocalModel?: string;
    defaultOpenAIModel?: string;
    defaultOpenRouterModel?: string;
}

// Note types
export interface Note extends BaseEntity {
    storyId: string;
    title: string;
    content: string;
    type: 'idea' | 'research' | 'todo' | 'other';
    updatedAt: Date;
}

// Lorebook types
export interface LorebookEntry extends BaseEntity {
    storyId: string;
    name: string;
    description: string;
    category: 'character' | 'location' | 'item' | 'event' | 'note' | 'synopsis' | 'starting scenario' | 'timeline';
    // Tags are stored as an array of strings, can contain spaces and special characters
    tags: string[];
    metadata?: {
        type?: string;
        importance?: 'major' | 'minor' | 'background';
        status?: 'active' | 'inactive' | 'historical';
        relationships?: Array<{
            targetId: string;
            type: string;
            description?: string;
        }>;
        customFields?: Record<string, unknown>;
    };
    isDisabled?: boolean;
}

// Prompt Parser types
export interface PromptParserConfig {
    storyId: string;
    chapterId?: string;
    promptId: string;
    scenebeat?: string;
    cursorPosition?: number;
    previousWords?: string;
    matchedEntries?: Set<LorebookEntry>;
    additionalContext?: Record<string, unknown>;
    chapterMatchedEntries?: Set<LorebookEntry>;
    sceneBeatMatchedEntries?: Set<LorebookEntry>;
    povCharacter?: string;
    povType?: 'First Person' | 'Third Person Limited' | 'Third Person Omniscient';
    storyLanguage?: string;
    sceneBeatContext?: {
        useMatchedChapter: boolean;
        useMatchedSceneBeat: boolean;
        useCustomContext: boolean;
        customContextItems?: string[]; // IDs of selected lorebook items
    };
}

export interface PromptContext {
    storyId: string;
    chapterId?: string;
    scenebeat?: string;
    cursorPosition?: number;
    previousWords?: string;
    matchedEntries?: Set<LorebookEntry>;
    chapters?: Chapter[];
    currentChapter?: Chapter;
    additionalContext?: Record<string, unknown>;
    chapterMatchedEntries?: Set<LorebookEntry>;
    sceneBeatMatchedEntries?: Set<LorebookEntry>;
    povCharacter?: string;
    povType?: 'First Person' | 'Third Person Limited' | 'Third Person Omniscient';
    storyLanguage?: string;
    sceneBeatContext?: {
        useMatchedChapter: boolean;
        useMatchedSceneBeat: boolean;
        useCustomContext: boolean;
        customContextItems?: string[]; // IDs of selected lorebook items
    };
}

export interface ParsedPrompt {
    messages: PromptMessage[];
    error?: string;
}

export type VariableResolver = (context: PromptContext, ...args: string[]) => Promise<string>;

// Story Export/Import types
export interface StoryExport {
    version: string;
    type: 'story';
    exportDate: string;
    story: Story;
    chapters: Chapter[];
    lorebookEntries: LorebookEntry[];
    sceneBeats: SceneBeat[];
    aiChats: AIChat[];
}
