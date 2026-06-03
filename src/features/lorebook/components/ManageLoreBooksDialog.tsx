/**
 * Dialog for managing which lore books are associated with a story.
 * - View / rename / delete books owned exclusively by this story
 * - Dissociate shared books (entries remain for other stories)
 * - Link an existing book from the library
 * - Create a new book and auto-associate it
 */
import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Unlink, Link, Pencil, Check, X } from "lucide-react";
import { toast } from "react-toastify";
import { useLoreBooksStore } from "../stores/useLoreBooksStore";
import { CreateLoreBookDialog } from "./CreateLoreBookDialog";
import { useLorebookStore } from "../stores/useLorebookStore";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { LoreBook } from "@/types/story";

interface ManageLoreBooksDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storyId: string;
}

export function ManageLoreBooksDialog({
    open,
    onOpenChange,
    storyId,
}: ManageLoreBooksDialogProps) {
    const {
        loreBooks,
        allLoreBooks,
        loadLoreBooksForStory,
        loadAllLoreBooks,
        createLoreBook,
        updateLoreBook,
        deleteLoreBook,
        associateLoreBook,
        dissociateLoreBook,
    } = useLoreBooksStore();
    const { entries } = useLorebookStore();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [dissociatingBook, setDissociatingBook] = useState<LoreBook | null>(null);
    const [deletingBook, setDeletingBook] = useState<LoreBook | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [linkBookId, setLinkBookId] = useState<string>("");

    useEffect(() => {
        if (open) {
            loadLoreBooksForStory(storyId);
            loadAllLoreBooks();
        }
    }, [open, storyId, loadLoreBooksForStory, loadAllLoreBooks]);

    const associatedIds = new Set(loreBooks.map(b => b.id));
    const linkableBooks = allLoreBooks.filter(b => !associatedIds.has(b.id));

    const entryCountForBook = (lorebookId: string) =>
        entries.filter(e => e.lorebookId === lorebookId).length;

    const handleCreateAndAssociate = async (name: string, description?: string) => {
        const id = await createLoreBook(name, description);
        await associateLoreBook(storyId, id);
        toast.success(`Lore book "${name}" created and linked`);
    };

    const handleLink = async () => {
        if (!linkBookId) return;
        await associateLoreBook(storyId, linkBookId);
        const book = allLoreBooks.find(b => b.id === linkBookId);
        toast.success(`Linked lore book "${book?.name}"`);
        setLinkBookId("");
    };

    const handleDissociate = async () => {
        if (!dissociatingBook) return;
        await dissociateLoreBook(storyId, dissociatingBook.id);
        toast.success(`Unlinked "${dissociatingBook.name}" — entries remain for other stories`);
        setDissociatingBook(null);
    };

    const handleDelete = async () => {
        if (!deletingBook) return;
        try {
            await deleteLoreBook(deletingBook.id, storyId);
            toast.success(`Deleted lore book "${deletingBook.name}"`);
        } catch (err) {
            toast.error(String(err));
        }
        setDeletingBook(null);
    };

    const startEdit = (book: LoreBook) => {
        setEditingId(book.id);
        setEditingName(book.name);
    };

    const saveEdit = async (book: LoreBook) => {
        if (editingName.trim() && editingName.trim() !== book.name) {
            await updateLoreBook(book.id, { name: editingName.trim() });
            toast.success("Lore book renamed");
        }
        setEditingId(null);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[520px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Manage Lore Books</DialogTitle>
                    </DialogHeader>

                    {/* Associated lore books */}
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Linked to this story</p>
                        {loreBooks.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">No lore books linked.</p>
                        )}
                        {loreBooks.map(book => {
                            const count = entryCountForBook(book.id);
                            const isEditing = editingId === book.id;
                            return (
                                <div key={book.id} className="flex items-center gap-2 p-2 rounded-md border bg-card">
                                    {isEditing ? (
                                        <Input
                                            value={editingName}
                                            onChange={e => setEditingName(e.target.value)}
                                            className="flex-1 h-7 text-sm"
                                            autoFocus
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') saveEdit(book);
                                                if (e.key === 'Escape') setEditingId(null);
                                            }}
                                        />
                                    ) : (
                                        <span className="flex-1 text-sm font-medium truncate">{book.name}</span>
                                    )}
                                    <Badge variant="outline" className="text-xs shrink-0">
                                        {count} {count === 1 ? 'entry' : 'entries'}
                                    </Badge>
                                    {isEditing ? (
                                        <>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveEdit(book)}>
                                                <Check className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                                                <X className="h-3.5 w-3.5" />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(book)} title="Rename">
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setDissociatingBook(book)} title="Unlink from this story">
                                                <Unlink className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingBook(book)} title="Delete lore book">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <Separator />

                    {/* Create new book */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Create a new lore book</p>
                        <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)} className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Create &amp; Link New Lore Book
                        </Button>
                    </div>

                    <Separator />

                    {/* Link existing book */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Link an existing lore book</p>
                        {linkableBooks.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No other lore books available.</p>
                        ) : (
                            <div className="flex gap-2">
                                <Select value={linkBookId} onValueChange={setLinkBookId}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Select a lore book…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {linkableBooks.map(b => (
                                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" size="icon" onClick={handleLink} disabled={!linkBookId} title="Link">
                                    <Link className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <CreateLoreBookDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSubmit={handleCreateAndAssociate}
            />

            {/* Dissociate confirmation */}
            <AlertDialog open={!!dissociatingBook} onOpenChange={() => setDissociatingBook(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unlink lore book?</AlertDialogTitle>
                        <AlertDialogDescription>
                            "{dissociatingBook?.name}" will no longer appear in this story.{" "}
                            {entryCountForBook(dissociatingBook?.id ?? '') > 0 && (
                                <span>
                                    The {entryCountForBook(dissociatingBook?.id ?? '')} entries in this lore book will be preserved
                                    and remain accessible from any other linked stories.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDissociate}>Unlink</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete confirmation */}
            <AlertDialog open={!!deletingBook} onOpenChange={() => setDeletingBook(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete lore book?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete "{deletingBook?.name}" and all{" "}
                            {entryCountForBook(deletingBook?.id ?? '')} of its entries.
                            This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
