import { useState, useMemo } from "react";
import { useLorebookStore } from "../stores/useLorebookStore";
import { CreateEntryDialog } from "./CreateEntryDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Search, EyeOff, Eye } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { LorebookEntry } from "@/types/story";
import { attemptPromise } from '@jfdi/attempt';

interface LorebookEntryListProps {
    entries: LorebookEntry[];
}

type SortOption = 'name' | 'category' | 'importance' | 'created';

export function LorebookEntryList({ entries: allEntries }: LorebookEntryListProps) {
    const { deleteEntry, updateEntry } = useLorebookStore();
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>('name');
    const [editingEntry, setEditingEntry] = useState<LorebookEntry | null>(null);
    const [deletingEntry, setDeletingEntry] = useState<LorebookEntry | null>(null);
    const [showDisabled, setShowDisabled] = useState(false);

    // Filter entries based on search term and disabled status
    const filteredEntries = useMemo(() =>
        allEntries.filter(entry => {
            // Apply search filter
            const searchMatch = !searchTerm || [
                entry.name,
                entry.description,
                ...(entry.tags || [])
            ].some(field =>
                field?.toLowerCase().includes(searchTerm.toLowerCase())
            );

            // Apply disabled filter
            const disabledMatch = showDisabled || !entry.isDisabled;

            return searchMatch && disabledMatch;
        }),
        [allEntries, searchTerm, showDisabled]
    );

    // Sort entries
    const sortedEntries = useMemo(() =>
        [...filteredEntries].sort((a, b) => {
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
        }),
        [filteredEntries, sortBy]
    );

    const handleDelete = async (entry: LorebookEntry) => {
        const [error] = await attemptPromise(async () => deleteEntry(entry.id));
        if (error) {
            console.error('Failed to delete entry:', error);
            return;
        }
        setDeletingEntry(null);
    };

    const toggleDisabled = async (entry: LorebookEntry) => {
        const [error] = await attemptPromise(async () =>
            updateEntry(entry.id, { isDisabled: !entry.isDisabled })
        );
        if (error) {
            console.error('Failed to update entry:', error);
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
                        className="pl-8 border-2 border-gray-300 dark:border-gray-700"
                    />
                </div>
                <div className="flex gap-2 items-center">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="show-disabled"
                            checked={showDisabled}
                            onCheckedChange={setShowDisabled}
                            className="border-2 border-gray-300 dark:border-gray-700 data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-800"
                        />
                        <Label htmlFor="show-disabled" className="font-medium">Show Disabled</Label>
                    </div>
                    <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                        <SelectTrigger className="w-[150px] border-2 border-gray-300 dark:border-gray-700">
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
                    {allEntries.length === 0
                        ? "No entries yet. Create your first entry!"
                        : "No entries match your search criteria."}
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sortedEntries.map((entry) => (
                    <Card
                        key={entry.id}
                        className={`border-2 border-gray-300 dark:border-gray-700 shadow-sm ${entry.isDisabled ? "opacity-60" : ""}`}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-50 dark:bg-transparent">
                            <CardTitle className="text-lg font-semibold">{entry.name}</CardTitle>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => toggleDisabled(entry)}
                                    title={entry.isDisabled ? "Enable entry" : "Disable entry"}
                                >
                                    {entry.isDisabled ? (
                                        <Eye className="h-4 w-4" />
                                    ) : (
                                        <EyeOff className="h-4 w-4" />
                                    )}
                                </Button>
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
                                {entry.isDisabled && (
                                    <Badge variant="outline" className="bg-destructive/10 text-destructive">Disabled</Badge>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                                {entry.tags && entry.tags.map((tag) => (
                                    <Badge
                                        key={tag}
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