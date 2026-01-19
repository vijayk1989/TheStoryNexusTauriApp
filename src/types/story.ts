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

// Templates used by the chat insert dropdown (separate from Prompts)
export interface Template extends BaseEntity {
    name: string;
    content: string; // the raw template text to insert into the chat input
    templateType?: 'chat' | 'other';
    storyId?: string | null; // optional scoping to a story
    isSystem?: boolean;
}

// AI Provider and Model types
export type AIProvider = 'openai' | 'openrouter' | 'local' | 'openai_compatible' | 'nanogpt';

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
    nanogptKey?: string;
    // OpenAI-compatible provider (custom URL + key)
    openaiCompatibleKey?: string;
    openaiCompatibleUrl?: string;
    openaiCompatibleModelsRoute?: string; // Custom route for fetching models (e.g., '/v1/models' or '/api/models')
    availableModels: AIModel[];
    lastModelsFetch?: Date;
    localApiUrl?: string;
    favoriteModelIds?: string[]; // User's favorited model IDs
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
    additionalContext?: Record<string, any>;
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
    additionalContext?: Record<string, any>;
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

// Agent Orchestration types
export type AgentRole =
    | 'summarizer'         // Condenses content to reduce tokens
    | 'prose_writer'       // Main creative writing agent
    | 'lore_judge'         // Validates lore consistency
    | 'continuity_checker' // Checks plot/character continuity
    | 'style_editor'       // Refines prose style/tone
    | 'dialogue_specialist' // Improves dialogue authenticity
    | 'expander'           // Expands brief notes into full prose
    | 'outline_generator'  // Generates story/chapter outlines
    | 'style_extractor'    // Extracts writing style from sample text
    | 'scenebeat_generator' // Generates scene beat commands
    | 'custom';            // User-defined agent role

// Context configuration for agents - controls what data is sent to the LLM
export type LorebookMode = 'matched' | 'all' | 'none' | 'custom';
export type PreviousWordsMode = 'full' | 'limited' | 'summarized' | 'none';

export interface AgentContextConfig {
    // Lorebook handling
    lorebookMode: LorebookMode;
    lorebookLimit?: number;                    // Max entries to include (for 'all' mode)
    lorebookCategories?: string[];             // Filter by category (optional)
    customLorebookEntryIds?: string[];         // Specific entries to include (for 'custom' mode)
    
    // Previous words handling
    previousWordsMode: PreviousWordsMode;
    previousWordsLimit?: number;               // Character limit when mode is 'limited'
    
    // Additional context toggles
    includeChapterSummary?: boolean;
    includePovInfo?: boolean;
}

// Default context configs by role
export const DEFAULT_CONTEXT_CONFIG: Record<AgentRole, AgentContextConfig> = {
    summarizer: {
        lorebookMode: 'none',
        previousWordsMode: 'full',
        includeChapterSummary: false,
        includePovInfo: false,
    },
    prose_writer: {
        lorebookMode: 'matched',
        previousWordsMode: 'limited',
        previousWordsLimit: 3000,
        includeChapterSummary: true,
        includePovInfo: true,
    },
    lore_judge: {
        lorebookMode: 'all',
        previousWordsMode: 'none',
        includeChapterSummary: false,
        includePovInfo: false,
    },
    continuity_checker: {
        lorebookMode: 'none',
        previousWordsMode: 'limited',
        previousWordsLimit: 2000,
        includeChapterSummary: false,
        includePovInfo: false,
    },
    style_editor: {
        lorebookMode: 'none',
        previousWordsMode: 'none',
        includeChapterSummary: false,
        includePovInfo: false,
    },
    dialogue_specialist: {
        lorebookMode: 'matched',
        previousWordsMode: 'none',
        includeChapterSummary: false,
        includePovInfo: true,
    },
    expander: {
        lorebookMode: 'matched',
        previousWordsMode: 'limited',
        previousWordsLimit: 1000,
        includeChapterSummary: false,
        includePovInfo: true,
    },
    custom: {
        lorebookMode: 'matched',
        previousWordsMode: 'limited',
        previousWordsLimit: 2000,
        includeChapterSummary: true,
        includePovInfo: true,
    },
    outline_generator: {
        lorebookMode: 'all',
        previousWordsMode: 'limited',
        previousWordsLimit: 2000,
        includeChapterSummary: true,
        includePovInfo: true,
    },
    style_extractor: {
        lorebookMode: 'none',
        previousWordsMode: 'full',
        includeChapterSummary: false,
        includePovInfo: false,
    },
    scenebeat_generator: {
        lorebookMode: 'matched',
        previousWordsMode: 'limited',
        previousWordsLimit: 3000,
        includeChapterSummary: true,
        includePovInfo: true,
    },
};

export interface AgentPreset extends BaseEntity {
    name: string;
    description?: string;
    role: AgentRole;
    model: AllowedModel;
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
    isSystem?: boolean;
    // Optional: track which story this preset belongs to (null = global)
    storyId?: string | null;
    // Context configuration - controls what data is sent to the LLM
    contextConfig?: AgentContextConfig;
}

export interface PipelineStep {
    agentPresetId: string;
    order: number;
    // Condition to determine if step should run (e.g., "wordCount > 5000", "previousOutputContains:ISSUE")
    condition?: string;
    // Whether to stream output for this step (typically prose writers)
    streamOutput?: boolean;
    // Revision mode: this step uses feedback from a previous judge to revise output
    isRevision?: boolean;
    // Maximum iterations for revision loops (default: 1, meaning no retry)
    maxIterations?: number;
    // Which step index to retry from if this step's condition passes (for revision loops)
    retryFromStep?: number;
}

export interface PipelinePreset extends BaseEntity {
    name: string;
    description?: string;
    steps: PipelineStep[];
    isSystem?: boolean;
    // Optional: track which story this preset belongs to (null = global)
    storyId?: string | null;
}

export interface AgentResult {
    role: AgentRole;
    agentName: string;
    output: string;
    promptSent?: PromptMessage[]; // The messages sent to the AI for diagnostics
    tokensUsed?: number;
    duration?: number;
    metadata?: Record<string, unknown>;
}

export interface PipelineExecution extends BaseEntity {
    storyId: string;
    chapterId?: string;
    pipelinePresetId?: string;
    pipelineName: string;
    input: string; // JSON serialized input
    results: AgentResult[];
    finalOutput: string;
    totalDuration: number;
    status: 'running' | 'completed' | 'failed' | 'aborted';
}
