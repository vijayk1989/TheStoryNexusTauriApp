import { useState, useEffect } from 'react';
import { useNotesStore } from '../stores/useNotesStore';
import { cn } from '@/lib/utils';
import { Plus, Trash2, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Note } from '@/types/story';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface NoteListProps {
    storyId: string;
}

export default function NoteList({ storyId }: NoteListProps) {
    const { notes, fetchNotes, selectedNote, selectNote, deleteNote, createNote, updateNote } = useNotesStore();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isNewNoteDialogOpen, setIsNewNoteDialogOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const [noteType, setNoteType] = useState<Note['type']>('idea');

    useEffect(() => {
        if (storyId) {
            fetchNotes(storyId);
        }
    }, [fetchNotes, storyId]);

    const handleDeleteNote = async (noteId: string) => {
        try {
            await deleteNote(noteId);
        } catch (error) {
            // Error is already handled in the store
        }
    };

    const handleEditClick = (note: Note, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingNote(note);
        setNewTitle(note.title);
        setNoteType(note.type);
        setIsEditDialogOpen(true);
    };

    const handleCreateNote = async () => {
        if (newTitle.trim()) {
            try {
                await createNote(storyId, newTitle.trim(), '', noteType);
                setIsNewNoteDialogOpen(false);
                setNewTitle('');
                setNoteType('idea');
            } catch (error) {
                // Error is already handled in the store
            }
        }
    };

    const handleSaveEdit = async () => {
        if (editingNote && newTitle.trim()) {
            try {
                await updateNote(editingNote.id, {
                    title: newTitle.trim(),
                    type: noteType
                });
                setIsEditDialogOpen(false);
                setEditingNote(null);
                setNewTitle('');
            } catch (error) {
                // Error is already handled in the store
            }
        }
    };

    const getNoteTypeLabel = (type: Note['type']) => {
        const labels: Record<Note['type'], string> = {
            idea: 'Idea',
            research: 'Research',
            todo: 'To-Do',
            other: 'Other'
        };
        return labels[type];
    };

    return (
        <div className={cn(
            "relative border-r border-input bg-background transition-all duration-300",
            isCollapsed ? "w-[40px]" : "w-[250px] sm:w-[300px]"
        )}>
            {/* Toggle button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-1/2 transform -translate-y-1/2 z-10 
                    bg-background border-input border rounded-full p-1 shadow-sm hover:bg-muted"
            >
                {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-foreground" />
                ) : (
                    <ChevronLeft className="h-4 w-4 text-foreground" />
                )}
            </button>

            {/* Note list content */}
            <div className={cn(
                "h-full overflow-y-auto",
                isCollapsed ? "hidden" : "block"
            )}>
                <div className="p-4 border-b border-input">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-semibold text-foreground">Notes</h2>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsNewNoteDialogOpen(true)}
                            className="flex items-center gap-1"
                        >
                            <Plus className="h-4 w-4" />
                            New Note
                        </Button>
                    </div>
                </div>
                <ul className="overflow-y-auto flex-1">
                    {notes.length === 0 ? (
                        <li className="p-8 flex flex-col items-center justify-center text-center">
                            <p className="text-muted-foreground mb-4">No notes yet</p>
                            <Button
                                onClick={() => setIsNewNoteDialogOpen(true)}
                                className="flex items-center gap-1"
                            >
                                <Plus className="h-4 w-4" />
                                Create Note
                            </Button>
                        </li>
                    ) : (
                        notes.map((note) => (
                            <li
                                key={note.id}
                                className={cn(
                                    "p-4 border-b border-input hover:bg-muted cursor-pointer relative group",
                                    selectedNote?.id === note.id && "bg-muted/50"
                                )}
                                onClick={() => selectNote(note)}
                            >
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium truncate">{note.title}</span>
                                        <span className="text-xs text-muted-foreground">{getNoteTypeLabel(note.type)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(note.updatedAt).toLocaleDateString()}
                                        </span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => handleEditClick(note, e)}
                                                className="h-6 w-6"
                                            >
                                                <Edit2 className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteNote(note.id);
                                                }}
                                                className="h-6 w-6 hover:text-destructive"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>

            {/* New Note Dialog */}
            <Dialog open={isNewNoteDialogOpen} onOpenChange={setIsNewNoteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Note</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Note title"
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <Select value={noteType} onValueChange={(value) => setNoteType(value as Note['type'])}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select note type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="idea">Idea</SelectItem>
                                    <SelectItem value="research">Research</SelectItem>
                                    <SelectItem value="todo">To-Do</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewNoteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateNote} disabled={!newTitle.trim()}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Note</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Note title"
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <Select value={noteType} onValueChange={(value) => setNoteType(value as Note['type'])}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select note type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="idea">Idea</SelectItem>
                                    <SelectItem value="research">Research</SelectItem>
                                    <SelectItem value="todo">To-Do</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={!newTitle.trim()}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
} 