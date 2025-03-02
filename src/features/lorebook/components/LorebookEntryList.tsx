import { useState } from "react";
import { useLorebookStore } from "../stores/useLorebookStore";
import { CreateEntryDialog } from "./CreateEntryDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Search, Filter } from "lucide-react";
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
import type { LorebookEntry } from "@/types/story";

interface LorebookEntryListProps {
    entries: LorebookEntry[];
}

type SortOption = 'name' | 'category' | 'importance' | 'created';

export function LorebookEntryList({ entries }: LorebookEntryListProps) {
    const { deleteEntry } = useLorebookStore();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [sortBy, setSortBy] = useState<SortOption>('name');
    const [editingEntry, setEditingEntry] = useState<LorebookEntry | null>(null);
    const [deletingEntry, setDeletingEntry] = useState<LorebookEntry | null>(null);

    // Filter entries based on search term and category
    const filteredEntries = entries.filter(entry => {
        const searchMatch = !searchTerm || [
            entry.name,
            entry.description,
            ...(entry.tags || [])
        ].some(field =>
            field?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const categoryMatch = selectedCategory === 'all' || entry.category === selectedCategory;

        return searchMatch && categoryMatch;
    });

    // Sort entries
    const sortedEntries = [...filteredEntries].sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'category':
                return a.category.localeCompare(b.category);
            case 'importance':
                return (a.metadata?.importance || '').localeCompare(b.metadata?.importance || '');
            case 'created':
                return b.createdAt.getTime() - a.createdAt.getTime();
            default:
                return 0;
        }
    });

    const handleDelete = async (entry: LorebookEntry) => {
        try {
            await deleteEntry(entry.id);
            setDeletingEntry(null);
        } catch (error) {
            console.error('Failed to delete entry:', error);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search entries..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <div className="flex gap-2">
                    <Select
                        value={selectedCategory}
                        onValueChange={setSelectedCategory}
                    >
                        <SelectTrigger className="w-[180px]">
                            <Filter className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="character">Character</SelectItem>
                            <SelectItem value="location">Location</SelectItem>
                            <SelectItem value="item">Item</SelectItem>
                            <SelectItem value="event">Event</SelectItem>
                            <SelectItem value="note">Note</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Sort by..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="category">Category</SelectItem>
                            <SelectItem value="importance">Importance</SelectItem>
                            <SelectItem value="created">Created Date</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Show message when no entries match the filters */}
            {sortedEntries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                    {entries.length === 0
                        ? "No entries yet. Create your first entry!"
                        : "No entries match your search criteria."}
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sortedEntries.map((entry) => (
                    <Card key={entry.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-semibold">{entry.name}</CardTitle>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setEditingEntry(entry)}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeletingEntry(entry)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2 mb-2">
                                <Badge variant="secondary">{entry.category}</Badge>
                                {entry.metadata?.importance && (
                                    <Badge variant="outline">{entry.metadata.importance}</Badge>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                                {entry.tags.map((tag, index) => (
                                    <Badge
                                        key={index}
                                        variant="secondary"
                                        className="bg-primary/10 text-xs px-2 py-0.5"
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-3">
                                {entry.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {editingEntry && (
                <CreateEntryDialog
                    open={!!editingEntry}
                    onOpenChange={() => setEditingEntry(null)}
                    storyId={editingEntry.storyId}
                    entry={editingEntry}
                />
            )}

            <AlertDialog open={!!deletingEntry} onOpenChange={() => setDeletingEntry(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the entry
                            "{deletingEntry?.name}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deletingEntry && handleDelete(deletingEntry)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
} 