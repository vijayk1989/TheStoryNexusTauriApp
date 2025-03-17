import { create } from 'zustand';
import { Note } from '@/types/story';
import { db } from '@/services/database';
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

export const useNotesStore = create<NotesState>((set, get) => ({
    notes: [],
    selectedNote: null,
    isLoading: false,
    error: null,

    fetchNotes: async (storyId: string) => {
        try {
            set({ isLoading: true, error: null });
            const notes = await db.notes
                .where('storyId')
                .equals(storyId)
                .reverse()
                .sortBy('updatedAt');
            set({ notes, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notes';
            set({ error: errorMessage, isLoading: false });
            toast.error(errorMessage);
        }
    },

    createNote: async (storyId: string, title: string, content: string, type: Note['type']) => {
        try {
            const id = crypto.randomUUID();
            const now = new Date();
            const newNote: Note = {
                id,
                storyId,
                title,
                content,
                type,
                createdAt: now,
                updatedAt: now
            };

            await db.notes.add(newNote);
            const notes = await db.notes
                .where('storyId')
                .equals(storyId)
                .reverse()
                .sortBy('updatedAt');
            set({ notes });
            toast.success('Note created successfully');
            return id;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create note';
            toast.error(errorMessage);
            throw error;
        }
    },

    updateNote: async (noteId: string, data: Partial<Note>) => {
        try {
            const note = await db.notes.get(noteId);
            if (!note) throw new Error('Note not found');

            const updatedNote = {
                ...note,
                ...data,
                updatedAt: new Date()
            };

            await db.notes.update(noteId, updatedNote);
            const notes = await db.notes
                .where('storyId')
                .equals(note.storyId)
                .reverse()
                .sortBy('updatedAt');
            set({ notes });
            toast.success('Note updated successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update note';
            toast.error(errorMessage);
            throw error;
        }
    },

    deleteNote: async (noteId: string) => {
        try {
            const note = await db.notes.get(noteId);
            if (!note) throw new Error('Note not found');

            await db.notes.delete(noteId);
            const notes = await db.notes
                .where('storyId')
                .equals(note.storyId)
                .reverse()
                .sortBy('updatedAt');
            set({ notes, selectedNote: null });
            toast.success('Note deleted successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete note';
            toast.error(errorMessage);
            throw error;
        }
    },

    selectNote: (note: Note | null) => {
        set({ selectedNote: note });
    }
})); 