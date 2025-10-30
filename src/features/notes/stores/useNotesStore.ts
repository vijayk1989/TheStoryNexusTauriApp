import { create } from 'zustand';
import { attemptPromise } from '@jfdi/attempt';
import { Note } from '@/types/story';
import { db } from '@/services/database';
import { formatError } from '@/utils/errorUtils';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import { generateNoteId } from '@/utils/idGenerator';
import { toast } from 'react-toastify';

interface NotesState {
    notes: Note[];
    selectedNote: Note | null;
    isLoading: boolean;
    error: string | null;
    fetchNotes: (storyId: string) => Promise<void>;
    createNote: (storyId: string, title: string, content: string, type: Note['type']) => Promise<string>;
    updateNote: (noteId: string, data: Partial<Note>) => Promise<void>;
    deleteNote: (noteId: string) => Promise<void>;
    selectNote: (note: Note | null) => void;
}

export const useNotesStore = create<NotesState>((set, _get) => ({
    notes: [],
    selectedNote: null,
    isLoading: false,
    error: null,

    fetchNotes: async (storyId: string) => {
        set({ isLoading: true, error: null });

        const [error, notes] = await attemptPromise(() =>
            db.notes
                .where('storyId')
                .equals(storyId)
                .reverse()
                .sortBy('updatedAt')
        );

        if (error) {
            const errorMessage = formatError(error, ERROR_MESSAGES.FETCH_FAILED('notes'));
            set({ error: errorMessage, isLoading: false });
            toast.error(errorMessage);
            return;
        }

        set({ notes, isLoading: false });
    },

    createNote: async (storyId: string, title: string, content: string, type: Note['type']) => {
        const now = new Date();
        const newNote: Note = {
            id: generateNoteId(),
            storyId,
            title,
            content,
            type,
            createdAt: now,
            updatedAt: now
        };

        const [addError] = await attemptPromise(() => db.notes.add(newNote));

        if (addError) {
            const errorMessage = formatError(addError, ERROR_MESSAGES.CREATE_FAILED('note'));
            toast.error(errorMessage);
            throw addError;
        }

        const [fetchError, notes] = await attemptPromise(() =>
            db.notes
                .where('storyId')
                .equals(storyId)
                .reverse()
                .sortBy('updatedAt')
        );

        if (fetchError) {
            // Note was created but refresh failed - not critical
            console.error(formatError(fetchError, ERROR_MESSAGES.FETCH_FAILED('notes')), fetchError);
        } else {
            set({ notes });
        }

        toast.success('Note created successfully');
        return newNote.id;
    },

    updateNote: async (noteId: string, data: Partial<Note>) => {
        const [fetchError, note] = await attemptPromise(() => db.notes.get(noteId));

        if (fetchError || !note) {
            const errorMessage = formatError(fetchError || new Error('Note not found'), ERROR_MESSAGES.NOT_FOUND('note'));
            toast.error(errorMessage);
            throw fetchError || new Error('Note not found');
        }

        const updatedNote = {
            ...note,
            ...data,
            updatedAt: new Date()
        };

        const [updateError] = await attemptPromise(() => db.notes.update(noteId, updatedNote));

        if (updateError) {
            const errorMessage = formatError(updateError, ERROR_MESSAGES.UPDATE_FAILED('note'));
            toast.error(errorMessage);
            throw updateError;
        }

        const [refetchError, notes] = await attemptPromise(() =>
            db.notes
                .where('storyId')
                .equals(note.storyId)
                .reverse()
                .sortBy('updatedAt')
        );

        if (refetchError) {
            console.error(formatError(refetchError, ERROR_MESSAGES.FETCH_FAILED('notes')), refetchError);
        } else {
            set({ notes });
        }

        toast.success('Note updated successfully');
    },

    deleteNote: async (noteId: string) => {
        const [fetchError, note] = await attemptPromise(() => db.notes.get(noteId));

        if (fetchError || !note) {
            const errorMessage = formatError(fetchError || new Error('Note not found'), ERROR_MESSAGES.NOT_FOUND('note'));
            toast.error(errorMessage);
            throw fetchError || new Error('Note not found');
        }

        const [deleteError] = await attemptPromise(() => db.notes.delete(noteId));

        if (deleteError) {
            const errorMessage = formatError(deleteError, ERROR_MESSAGES.DELETE_FAILED('note'));
            toast.error(errorMessage);
            throw deleteError;
        }

        const [refetchError, notes] = await attemptPromise(() =>
            db.notes
                .where('storyId')
                .equals(note.storyId)
                .reverse()
                .sortBy('updatedAt')
        );

        if (refetchError) {
            console.error(formatError(refetchError, ERROR_MESSAGES.FETCH_FAILED('notes')), refetchError);
        } else {
            set({ notes, selectedNote: null });
        }

        toast.success('Note deleted successfully');
    },

    selectNote: (note: Note | null) => {
        set({ selectedNote: note });
    }
})); 