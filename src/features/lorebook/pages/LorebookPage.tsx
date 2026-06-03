import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useLorebookStore } from "../stores/useLorebookStore";
import { useLoreBooksStore } from "../stores/useLoreBooksStore";
import { useStoryStore } from "@/features/stories/stores/useStoryStore";
import { CreateEntryDialog } from "../components/CreateEntryDialog";
import { LorebookEntryList } from "../components/LorebookEntryList";
import { LorebookWorkshopDialog } from "../components/LorebookWorkshopDialog";
import { ManageLoreBooksDialog } from "../components/ManageLoreBooksDialog";
import { TimelineView } from "../components/TimelineView";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload, Wand2, BookOpen, Settings2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "react-toastify";
import type { LorebookEntry } from "@/types/story";

export default function LorebookPage() {
    const { storyId } = useParams<{ storyId: string }>();
    const {
        loadEntries,
        entries,
        isLoading,
        error,
        buildTagMap,
        exportEntries,
        importEntries
    } = useLorebookStore();
    const { loreBooks, loadLoreBooksForStory } = useLoreBooksStore();
    const { currentStory } = useStoryStore();

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isWorkshopOpen, setIsWorkshopOpen] = useState(false);
    const [isManageOpen, setIsManageOpen] = useState(false);
    const [workshopEntry, setWorkshopEntry] = useState<LorebookEntry | undefined>(undefined);
    const [activeTab, setActiveTab] = useState("all");
    // which lorebook to filter by ("all" = all books)
    const [activeLorebookFilter, setActiveLorebookFilter] = useState<string>("all");

    // Load lore books, then load entries from all associated books
    useEffect(() => {
        if (storyId) {
            loadLoreBooksForStory(storyId).then(async () => {
                const ids = currentStory?.lorebookIds ?? [];
                await loadEntries(ids);
                buildTagMap();
            });
        }
    }, [storyId, loadEntries, buildTagMap, loadLoreBooksForStory, currentStory]);

    const defaultLorebookId = loreBooks[0]?.id ?? '';

    // Apply lorebook + category filters
    const filteredEntries = entries.filter(entry => {
        const lorebookMatch = activeLorebookFilter === 'all' || entry.lorebookId === activeLorebookFilter;
        const categoryMatch = activeTab === 'all' || entry.category === activeTab;
        return lorebookMatch && categoryMatch;
    });

    const categoryCounts = filteredEntries.reduce((acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const handleExport = () => {
        const targetId = activeLorebookFilter !== 'all' ? activeLorebookFilter : defaultLorebookId;
        if (targetId) {
            try {
                exportEntries(targetId);
                toast.success("Lorebook entries exported successfully");
            } catch (error) {
                console.error("Export failed:", error);
                toast.error("Failed to export lorebook entries");
            }
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const targetId = activeLorebookFilter !== 'all' ? activeLorebookFilter : defaultLorebookId;
        if (!targetId || !event.target.files || event.target.files.length === 0) return;

        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                await importEntries(content, targetId);
                toast.success("Lorebook entries imported successfully");
            } catch (error) {
                console.error("Import failed:", error);
                toast.error("Failed to import lorebook entries");
            }
        };

        reader.readAsText(file);
        event.target.value = '';
    };

    if (error) {
        return (
            <div className="p-4">
                <p className="text-destructive">Error loading lorebook: {error}</p>
            </div>
        );
    }

    // Empty state: no lore books linked
    if (!isLoading && loreBooks.length === 0) {
        return (
            <div className="container mx-auto p-4 md:p-6 space-y-6">
                <h1 className="text-2xl md:text-3xl font-bold">Lorebook</h1>
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No lore books linked to this story yet.</p>
                    <p className="text-sm text-muted-foreground">Use the Manage Lore Books button to create or link a lore book.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Lorebook</h1>
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">
                        Manage your story's characters, locations, and other elements
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => setIsManageOpen(true)} size="sm" className="border-2 border-gray-300 dark:border-gray-700">
                        <Settings2 className="w-4 h-4 mr-2" />
                        Manage Lore Books
                    </Button>
                    <Button variant="outline" onClick={handleExport} size="sm" className="border-2 border-gray-300 dark:border-gray-700">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                    <label htmlFor="import-lorebook">
                        <Button variant="outline" size="sm" asChild className="border-2 border-gray-300 dark:border-gray-700">
                            <div>
                                <Upload className="w-4 h-4 mr-2" />
                                Import
                            </div>
                        </Button>
                    </label>
                    <input
                        id="import-lorebook"
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleImport}
                    />
                    <Button
                        variant="outline"
                        onClick={() => { setWorkshopEntry(undefined); setIsWorkshopOpen(true); }}
                        size="sm"
                        className="border-2 border-gray-300 dark:border-gray-700"
                    >
                        <Wand2 className="w-4 h-4 mr-2" />
                        Workshop
                    </Button>
                    <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        New Entry
                    </Button>
                </div>
            </div>

            {/* Lore book filter pills (shown when >1 book) */}
            {loreBooks.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setActiveLorebookFilter('all')}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${activeLorebookFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-gray-300 dark:border-gray-600 hover:bg-muted'}`}
                    >
                        All Books ({entries.length})
                    </button>
                    {loreBooks.map(book => {
                        const count = entries.filter(e => e.lorebookId === book.id).length;
                        return (
                            <button
                                key={book.id}
                                onClick={() => setActiveLorebookFilter(book.id)}
                                className={`px-3 py-1 rounded-full text-sm border transition-colors ${activeLorebookFilter === book.id ? 'bg-primary text-primary-foreground border-primary' : 'border-gray-300 dark:border-gray-600 hover:bg-muted'}`}
                            >
                                {book.name} ({count})
                            </button>
                        );
                    })}
                </div>
            )}

            <Separator className="bg-gray-300 dark:bg-gray-700" />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-2">
                    <TabsList className="inline-flex w-max bg-gray-100 dark:bg-gray-800 p-1 border border-gray-300 dark:border-gray-700">
                        <TabsTrigger value="all" className="whitespace-nowrap text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-primary">
                            All ({filteredEntries.length})
                        </TabsTrigger>
                        <TabsTrigger value="character" className="whitespace-nowrap text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-primary">
                            Characters ({categoryCounts.character || 0})
                        </TabsTrigger>
                        <TabsTrigger value="location" className="whitespace-nowrap text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-primary">
                            Locations ({categoryCounts.location || 0})
                        </TabsTrigger>
                        <TabsTrigger value="item" className="whitespace-nowrap text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-primary">
                            Items ({categoryCounts.item || 0})
                        </TabsTrigger>
                        <TabsTrigger value="event" className="whitespace-nowrap text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-primary">
                            Events ({categoryCounts.event || 0})
                        </TabsTrigger>
                        <TabsTrigger value="note" className="whitespace-nowrap text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-primary">
                            Notes ({categoryCounts.note || 0})
                        </TabsTrigger>
                        <TabsTrigger value="synopsis" className="whitespace-nowrap text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-primary">
                            Synopsis ({categoryCounts.synopsis || 0})
                        </TabsTrigger>
                        <TabsTrigger value="starting scenario" className="whitespace-nowrap text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-primary">
                            Starting ({categoryCounts['starting scenario'] || 0})
                        </TabsTrigger>
                        <TabsTrigger value="timeline" className="whitespace-nowrap text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-primary">
                            Timeline ({categoryCounts.timeline || 0})
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value={activeTab} className="mt-4 md:mt-6">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : activeTab === "timeline" ? (
                        <TimelineView entries={filteredEntries} />
                    ) : (
                        <LorebookEntryList
                            entries={filteredEntries}
                            loreBooks={loreBooks}
                            defaultLorebookId={defaultLorebookId}
                        />
                    )}
                </TabsContent>
            </Tabs>

            <CreateEntryDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                lorebookId={activeLorebookFilter !== 'all' ? activeLorebookFilter : defaultLorebookId}
                availableLoreBooks={loreBooks}
            />

            <LorebookWorkshopDialog
                open={isWorkshopOpen}
                onOpenChange={(open) => {
                    if (!open) { setIsWorkshopOpen(false); setWorkshopEntry(undefined); }
                    else { setIsWorkshopOpen(true); }
                }}
                lorebookId={activeLorebookFilter !== 'all' ? activeLorebookFilter : defaultLorebookId}
                targetEntry={workshopEntry}
                initialCategory={activeTab !== 'all' ? (activeTab as LorebookEntry['category']) : undefined}
            />

            {storyId && (
                <ManageLoreBooksDialog
                    open={isManageOpen}
                    onOpenChange={setIsManageOpen}
                    storyId={storyId}
                />
            )}
        </div>
    );
}
