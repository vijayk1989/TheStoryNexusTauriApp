import { useNavigate } from "react-router";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Download, Upload } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "react-toastify";
import { useLoreBooksStore } from "../stores/useLoreBooksStore";
import { useLorebookStore } from "../stores/useLorebookStore";
import type { LoreBook } from "@/types/story";

interface LoreBookCardProps {
    book: LoreBook;
    entryCount: number;
    onEdit: (book: LoreBook) => void;
}

export function LoreBookCard({ book, entryCount, onEdit }: LoreBookCardProps) {
    const navigate = useNavigate();
    const { deleteLoreBook, loadAllLoreBooks } = useLoreBooksStore();
    const { exportEntries, importEntries } = useLorebookStore();

    const handleCardClick = () => {
        navigate(`/lorebooks/${book.id}`);
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(book);
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm(`Delete lore book "${book.name}"? This will permanently delete all ${entryCount} entries. This cannot be undone.`)) return;
        try {
            await deleteLoreBook(book.id);
            toast.success(`Deleted "${book.name}"`);
        } catch (err) {
            toast.error(String(err));
        }
    };

    const handleExport = (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            exportEntries(book.id);
            toast.success("Entries exported successfully");
        } catch {
            toast.error("Failed to export entries");
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                await importEntries(content, book.id);
                await loadAllLoreBooks();
                toast.success("Entries imported successfully");
            } catch {
                toast.error("Failed to import entries");
            }
        };
        reader.readAsText(file);
        event.target.value = "";
    };

    return (
        <Card
            className="w-full cursor-pointer border-2 border-gray-300 dark:border-gray-700 hover:bg-accent hover:text-accent-foreground transition-colors shadow-sm"
            onClick={handleCardClick}
        >
            <CardHeader>
                <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{book.name}</CardTitle>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                        {entryCount} {entryCount === 1 ? "entry" : "entries"}
                    </Badge>
                </div>
                {book.description && (
                    <CardDescription className="line-clamp-2">{book.description}</CardDescription>
                )}
            </CardHeader>
            <CardContent>
                <p className="text-xs text-muted-foreground">
                    Created {new Date(book.createdAt).toLocaleDateString()}
                </p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleExport}>
                                <Download className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Export entries as JSON</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <label htmlFor={`import-${book.id}`} onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" asChild>
                                    <div>
                                        <Upload className="h-4 w-4" />
                                    </div>
                                </Button>
                            </label>
                        </TooltipTrigger>
                        <TooltipContent><p>Import entries from JSON</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <input
                    id={`import-${book.id}`}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImport}
                    onClick={(e) => e.stopPropagation()}
                />

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleEdit}>
                                <Edit className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Edit lore book</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Delete lore book</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </CardFooter>
        </Card>
    );
}
