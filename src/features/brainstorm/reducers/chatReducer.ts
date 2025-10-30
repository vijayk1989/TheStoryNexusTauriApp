import { ChatMessage, Prompt, AllowedModel, LorebookEntry, Chapter } from "@/types/story";

export interface ChatState {
  // Chat state
  input: string;
  isGenerating: boolean;
  messages: ChatMessage[];
  currentChatId: string;

  // Context state
  includeFullContext: boolean;
  contextOpen: boolean;
  chapters: Chapter[];
  selectedSummaries: string[];
  selectedChapterContent: string[];
  selectedItems: LorebookEntry[];

  // Prompt state
  selectedPrompt: Prompt | null;
  selectedModel: AllowedModel | null;
  availableModels: AllowedModel[];
  showPreview: boolean;
  previewMessages: any;
  previewLoading: boolean;
  previewError: string | null;

  // Editing state
  editingMessageId: string | null;
  editingContent: string;
  streamingMessageId: string | null;
}

export type ChatAction =
  | { type: "SET_INPUT"; payload: string }
  | { type: "SET_IS_GENERATING"; payload: boolean }
  | { type: "SET_MESSAGES"; payload: ChatMessage[] }
  | { type: "ADD_MESSAGE"; payload: ChatMessage }
  | { type: "UPDATE_MESSAGE"; payload: { id: string; content: string } }
  | { type: "UPDATE_EDITED_MESSAGE"; payload: { id: string; content: string; editedAt: string; originalContent?: string } }
  | { type: "SET_CURRENT_CHAT_ID"; payload: string }
  | { type: "SET_INCLUDE_FULL_CONTEXT"; payload: boolean }
  | { type: "TOGGLE_FULL_CONTEXT" }
  | { type: "SET_CONTEXT_OPEN"; payload: boolean }
  | { type: "TOGGLE_CONTEXT_OPEN" }
  | { type: "SET_CHAPTERS"; payload: Chapter[] }
  | { type: "SET_SELECTED_SUMMARIES"; payload: string[] }
  | { type: "TOGGLE_SUMMARY"; payload: string }
  | { type: "SET_SELECTED_CHAPTER_CONTENT"; payload: string[] }
  | { type: "ADD_CHAPTER_CONTENT"; payload: string }
  | { type: "REMOVE_CHAPTER_CONTENT"; payload: string }
  | { type: "SET_SELECTED_ITEMS"; payload: LorebookEntry[] }
  | { type: "ADD_ITEM"; payload: LorebookEntry }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "SET_SELECTED_PROMPT"; payload: Prompt | null }
  | { type: "SET_SELECTED_MODEL"; payload: AllowedModel | null }
  | { type: "SET_PROMPT_AND_MODEL"; payload: { prompt: Prompt; model: AllowedModel } }
  | { type: "SET_AVAILABLE_MODELS"; payload: AllowedModel[] }
  | { type: "SET_SHOW_PREVIEW"; payload: boolean }
  | { type: "SET_PREVIEW_MESSAGES"; payload: any }
  | { type: "SET_PREVIEW_LOADING"; payload: boolean }
  | { type: "SET_PREVIEW_ERROR"; payload: string | null }
  | { type: "START_PREVIEW" }
  | { type: "PREVIEW_SUCCESS"; payload: any }
  | { type: "PREVIEW_ERROR"; payload: string }
  | { type: "CLOSE_PREVIEW" }
  | { type: "SET_EDITING_MESSAGE_ID"; payload: string | null }
  | { type: "SET_EDITING_CONTENT"; payload: string }
  | { type: "START_EDIT"; payload: { id: string; content: string } }
  | { type: "CANCEL_EDIT" }
  | { type: "SET_STREAMING_MESSAGE_ID"; payload: string | null }
  | { type: "CLEAR_CONTEXT_SELECTIONS" }
  | { type: "RESET_TO_INITIAL_STATE"; payload: Partial<ChatState> }
  | { type: "START_GENERATION"; payload: { userMessage: ChatMessage; assistantMessage: ChatMessage; chatId: string } }
  | { type: "COMPLETE_GENERATION" }
  | { type: "ABORT_GENERATION" };

export const initialChatState: ChatState = {
  input: "",
  isGenerating: false,
  messages: [],
  currentChatId: "",
  includeFullContext: false,
  contextOpen: false,
  chapters: [],
  selectedSummaries: [],
  selectedChapterContent: [],
  selectedItems: [],
  selectedPrompt: null,
  selectedModel: null,
  availableModels: [],
  showPreview: false,
  previewMessages: undefined,
  previewLoading: false,
  previewError: null,
  editingMessageId: null,
  editingContent: "",
  streamingMessageId: null,
};

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SET_INPUT":
      return { ...state, input: action.payload };

    case "SET_IS_GENERATING":
      return { ...state, isGenerating: action.payload };

    case "SET_MESSAGES":
      return { ...state, messages: action.payload };

    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] };

    case "UPDATE_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.id ? { ...msg, content: action.payload.content } : msg
        ),
      };

    case "UPDATE_EDITED_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.id
            ? {
                ...msg,
                content: action.payload.content,
                editedAt: action.payload.editedAt,
                originalContent: action.payload.originalContent ?? msg.originalContent ?? msg.content,
              }
            : msg
        ),
      };

    case "SET_CURRENT_CHAT_ID":
      return { ...state, currentChatId: action.payload };

    case "SET_INCLUDE_FULL_CONTEXT":
      return { ...state, includeFullContext: action.payload };

    case "TOGGLE_FULL_CONTEXT":
      return { ...state, includeFullContext: !state.includeFullContext };

    case "SET_CONTEXT_OPEN":
      return { ...state, contextOpen: action.payload };

    case "TOGGLE_CONTEXT_OPEN":
      return { ...state, contextOpen: !state.contextOpen };

    case "SET_CHAPTERS":
      return { ...state, chapters: action.payload };

    case "SET_SELECTED_SUMMARIES":
      return { ...state, selectedSummaries: action.payload };

    case "TOGGLE_SUMMARY":
      return {
        ...state,
        selectedSummaries: state.selectedSummaries.includes(action.payload)
          ? state.selectedSummaries.filter((id) => id !== action.payload)
          : [...state.selectedSummaries, action.payload],
      };

    case "SET_SELECTED_CHAPTER_CONTENT":
      return { ...state, selectedChapterContent: action.payload };

    case "ADD_CHAPTER_CONTENT":
      return {
        ...state,
        selectedChapterContent: state.selectedChapterContent.includes(action.payload)
          ? state.selectedChapterContent
          : [...state.selectedChapterContent, action.payload],
      };

    case "REMOVE_CHAPTER_CONTENT":
      return {
        ...state,
        selectedChapterContent: state.selectedChapterContent.filter((id) => id !== action.payload),
      };

    case "SET_SELECTED_ITEMS":
      return { ...state, selectedItems: action.payload };

    case "ADD_ITEM":
      return {
        ...state,
        selectedItems: state.selectedItems.some((item) => item.id === action.payload.id)
          ? state.selectedItems
          : [...state.selectedItems, action.payload],
      };

    case "REMOVE_ITEM":
      return {
        ...state,
        selectedItems: state.selectedItems.filter((item) => item.id !== action.payload),
      };

    case "SET_SELECTED_PROMPT":
      return { ...state, selectedPrompt: action.payload };

    case "SET_SELECTED_MODEL":
      return { ...state, selectedModel: action.payload };

    case "SET_PROMPT_AND_MODEL":
      return {
        ...state,
        selectedPrompt: action.payload.prompt,
        selectedModel: action.payload.model,
      };

    case "SET_AVAILABLE_MODELS":
      return { ...state, availableModels: action.payload };

    case "SET_SHOW_PREVIEW":
      return { ...state, showPreview: action.payload };

    case "SET_PREVIEW_MESSAGES":
      return { ...state, previewMessages: action.payload };

    case "SET_PREVIEW_LOADING":
      return { ...state, previewLoading: action.payload };

    case "SET_PREVIEW_ERROR":
      return { ...state, previewError: action.payload };

    case "START_PREVIEW":
      return {
        ...state,
        previewLoading: true,
        previewError: null,
        previewMessages: undefined,
      };

    case "PREVIEW_SUCCESS":
      return {
        ...state,
        previewLoading: false,
        previewMessages: action.payload,
        showPreview: true,
      };

    case "PREVIEW_ERROR":
      return {
        ...state,
        previewLoading: false,
        previewError: action.payload,
      };

    case "CLOSE_PREVIEW":
      return { ...state, showPreview: false };

    case "SET_EDITING_MESSAGE_ID":
      return { ...state, editingMessageId: action.payload };

    case "SET_EDITING_CONTENT":
      return { ...state, editingContent: action.payload };

    case "START_EDIT":
      return {
        ...state,
        editingMessageId: action.payload.id,
        editingContent: action.payload.content,
      };

    case "CANCEL_EDIT":
      return {
        ...state,
        editingMessageId: null,
        editingContent: "",
      };

    case "SET_STREAMING_MESSAGE_ID":
      return { ...state, streamingMessageId: action.payload };

    case "CLEAR_CONTEXT_SELECTIONS":
      return {
        ...state,
        selectedSummaries: [],
        selectedItems: [],
        selectedChapterContent: [],
      };

    case "RESET_TO_INITIAL_STATE":
      return { ...initialChatState, ...action.payload };

    case "START_GENERATION":
      return {
        ...state,
        isGenerating: true,
        previewError: null,
        input: "",
        messages: [...state.messages, action.payload.userMessage, action.payload.assistantMessage],
        currentChatId: action.payload.chatId,
        streamingMessageId: action.payload.assistantMessage.id,
      };

    case "COMPLETE_GENERATION":
      return {
        ...state,
        isGenerating: false,
        streamingMessageId: null,
      };

    case "ABORT_GENERATION":
      return {
        ...state,
        isGenerating: false,
        streamingMessageId: null,
      };

    default:
      return state;
  }
}
