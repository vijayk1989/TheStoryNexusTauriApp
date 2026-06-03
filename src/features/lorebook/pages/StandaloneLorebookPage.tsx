import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { useLorebookStore } from "../stores/useLorebookStore";
import { useLoreBooksStore } from "../stores/useLoreBooksStore";
import { CreateEntryDialog } from "../components/CreateEntryDialog";
import { LorebookEntryList } from "../components/LorebookEntryList";
import { LorebookWorkshopDialog } from "../components/LorebookWorkshopDialog";
import { EditLoreBookDialog } from "../components/EditLoreBookDialog";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload, Wand2, ChevronLeft, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "react-toastify";
import type { LorebookEntry } from "@/types/story";

export default function StandaloneLorebookPage() {
    const { lorebookId } = useParams<{ lorebookId: string }>();
    const {
        loadEntries,
        entries,
        isLoading,
        error,
        buildTagMap,
        exportEntries,
        importEntries,
    } = useLorebookStore();
    const { allLoreBooks, loadAllLoreBooks } = useLoreBooksStore();

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isWorkshopOpen, setIsWorkshopOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [workshopEntry, setWorkshopEntry] = useState<LorebookEntry | undefined>(undefined);
    const [activeTab, setActiveTab] = useState("all");

    useEffect(() => {
        if (lorebookId) {
            loadAllLoreBooks().then(async () => {
                await loadEntries([lorebookId]);
                buildTagMap();
            });
        }
    }, [lorebookId, loadEntries, buildTagMap, loadAllLoreBooks]);

    const currentBook = allLoreBooks.find((b) => b.id === lorebookId);

    const categoryCounts = entries.reduce((acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const filteredEntries =
        activeTab === "all" ? entries : entries.filter((e) => e.category === activeTab);

    const handleExport = () => {
        if (!lorebookId) return;
        try {
            exportEntries(lorebookId);
            toast.success("Lorebook entries exported successfully");
        } catch {
            toast.error("Failed to export lorebook entries");
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!lorebookId || !event.target.files || event.target.files.length === 0) return;
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                await importEntries(content, lorebookId);
                toast.success("Lorebook entries imported successfully");
            } catch {
                toast.error("Failed to import lorebook entries");
            }
        };
        reader.readAsText(file);
        event.target.value = "";
    };

    if (error) {
        return (
            <div className="p-4">
                <p className="text-destructive">Error loading lorebook: {error}</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Back navigation */}
            <Link
                to="/lorebooks"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ChevronLeft className="h-4 w-4" />
                All Lore Books
            </Link>

            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl md:text-3xl font-bold">
                            {currentBook?.name ?? "Lore Book"}
                        </h1>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setIsEditOpen(true)}
                            title="Edit lore book"
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </div>
                    {currentBook?.description && (
                        <p className="text-muted-foreground mt-1 text-sm md:text-base">
                            {currentBook.description}
                        </p>
                    )}
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={handleExport} size="sm" className="border-2 border-gray-300 dark:border-gray-700">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                    <label htmlFor="import-standalone-lorebook">
                        <Button variant="outline" size="sm" asChild className="border-2 border-gray-300 dark:border-gray-700">
                            <div>
                                <Upload className="w-4 h-4 mr-2" />
                                Import
                            </div>
                        </Button>
                    </label>
                    <input
                        id="import-standalone-lorebook"
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

            <Separator className="bg-gray-300 dark:bg-gray-700" />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-2">
                    <TabsList className="inline-flex w-max bg-gray-100 dark:bg-gray-800 p-1 border border-gray-300 dark:border-gray-700">
                        <TabsTrigger value="all" className="whitespace-nowrap text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-primary">
                            All ({entries.length})
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
                    ) : (
                        <LorebookEntryList
                            entries={filteredEntries}
                            loreBooks={currentBook ? [currentBook] : []}
                            defaultLorebookId={lorebookId ?? ""}
                        />
                    )}
                </TabsContent>
            </Tabs>

            {lorebookId && (
                <CreateEntryDialog
                    open={isCreateDialogOpen}
                    onOpenChange={setIsCreateDialogOpen}
                    lorebookId={lorebookId}
                    availableLoreBooks={currentBook ? [currentBook] : []}
                />
            )}

            {lorebookId && (
                <LorebookWorkshopDialog
                    open={isWorkshopOpen}
                    onOpenChange={(open) => {
                        if (!open) { setIsWorkshopOpen(false); setWorkshopEntry(undefined); }
                        else { setIsWorkshopOpen(true); }
                    }}
                    lorebookId={lorebookId}
                    targetEntry={workshopEntry}
                    initialCategory={activeTab !== "all" ? (activeTab as LorebookEntry["category"]) : undefined}
                />
            )}

            {currentBook && isEditOpen && (
                <EditLoreBookDialog
                    open={isEditOpen}
                    onOpenChange={setIsEditOpen}
                    book={currentBook}
                />
            )}
        </div>
    );
}
