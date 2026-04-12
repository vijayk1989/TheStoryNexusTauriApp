import { useEffect, useState } from "react";
import { useLoreBooksStore } from "../stores/useLoreBooksStore";
import { LoreBookCard } from "../components/LoreBookCard";
import { CreateLoreBookDialog } from "../components/CreateLoreBookDialog";
import { EditLoreBookDialog } from "../components/EditLoreBookDialog";
import { Button } from "@/components/ui/button";
import { Library, Plus } from "lucide-react";
import type { LoreBook } from "@/types/story";

export default function LoreBooksPage() {
    const { allLoreBooks, lorebookEntryCounts, loadAllLoreBooks, createLoreBook } = useLoreBooksStore();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingBook, setEditingBook] = useState<LoreBook | null>(null);

    useEffect(() => {
        loadAllLoreBooks();
    }, [loadAllLoreBooks]);

    const handleCreate = async (name: string, description?: string) => {
        await createLoreBook(name, description);
        await loadAllLoreBooks();
    };

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8 md:space-y-12">
                <div className="text-center">
                    <h1 className="text-2xl md:text-4xl font-bold mb-6 md:mb-8">Lore Books</h1>
                    <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 mb-6 md:mb-8">
                        <Button onClick={() => setIsCreateOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create New Lore Book
                        </Button>
                    </div>
                </div>

                {allLoreBooks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                        <Library className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">No lore books yet.</p>
                        <p className="text-sm text-muted-foreground">Create your first lore book to start building your world.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 place-items-center">
                        {allLoreBooks.map((book) => (
                            <LoreBookCard
                                key={book.id}
                                book={book}
                                entryCount={lorebookEntryCounts[book.id] ?? 0}
                                onEdit={setEditingBook}
                            />
                        ))}
                    </div>
                )}
            </div>

            <CreateLoreBookDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSubmit={handleCreate}
            />

            {editingBook && (
                <EditLoreBookDialog
                    open={!!editingBook}
                    onOpenChange={(open) => {
                        if (!open) setEditingBook(null);
                    }}
                    book={editingBook}
                />
            )}
        </div>
    );
}
