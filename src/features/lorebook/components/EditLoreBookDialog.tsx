import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLoreBooksStore } from "../stores/useLoreBooksStore";
import type { LoreBook } from "@/types/story";

interface EditLoreBookDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    book: LoreBook;
}

export function EditLoreBookDialog({
    open,
    onOpenChange,
    book,
}: EditLoreBookDialogProps) {
    const { updateLoreBook } = useLoreBooksStore();
    const [name, setName] = useState(book.name);
    const [description, setDescription] = useState(book.description ?? "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSubmitting(true);
        try {
            await updateLoreBook(book.id, {
                name: name.trim(),
                description: description.trim() || undefined,
            });
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Edit Lore Book</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="editLorebookName">Name</Label>
                            <Input
                                id="editLorebookName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="editLorebookDesc">Description (optional)</Label>
                            <Textarea
                                id="editLorebookDesc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description of this lore book's scope"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !name.trim()}>
                            {isSubmitting ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
