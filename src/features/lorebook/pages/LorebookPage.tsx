import { useEffect } from "react";
import { useParams } from "react-router";
import { useLorebookStore } from "../stores/useLorebookStore";
import { CreateEntryDialog } from "../components/CreateEntryDialog";
import { LorebookEntryList } from "../components/LorebookEntryList";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "react-toastify";

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
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("all");

    useEffect(() => {
        if (storyId) {
            loadEntries(storyId).then(() => {
                buildTagMap();
            });
        }
    }, [storyId, loadEntries, buildTagMap]);

    // Calculate category counts from the current entries
    const categoryCounts = entries.reduce((acc, entry) => {
        // Skip disabled entries in the count if you want
        // if (entry.isDisabled) return acc;

        acc[entry.category] = (acc[entry.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Handle export functionality
    const handleExport = async () => {
        if (storyId) {
            try {
                const isSaved = await exportEntries(storyId);
                if (isSaved) {
                    toast.success("Lorebook entries exported successfully");
                }
            } catch (error) {
                console.error("Export failed:", error);
                toast.error("Failed to export lorebook entries");
            }
        }
    };

    // Handle import functionality
    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!storyId || !event.target.files || event.target.files.length === 0) return;

        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                await importEntries(content, storyId);
                // Reload entries after import
                await loadEntries(storyId);
                buildTagMap();
                toast.success("Lorebook entries imported successfully");
            } catch (error) {
                console.error("Import failed:", error);
                toast.error("Failed to import lorebook entries");
            }
        };

        reader.readAsText(file);
        // Reset the input
        event.target.value = '';
    };

    if (error) {
        return (
            <div className="p-4">
                <p className="text-destructive">Error loading lorebook: {error}</p>
            </div>
        );
    }

    // Apply the filter based on the active tab
    const filteredEntries = activeTab === "all"
        ? entries
        : entries.filter(entry => entry.category === activeTab);

    // Debug logging to help identify issues
    console.log("Active tab:", activeTab);
    console.log("Category counts:", categoryCounts);
    console.log("Total entries:", entries.length);
    console.log("Filtered entries:", filteredEntries.length);

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
                        <TabsTrigger
                            value="all"
                            className="whitespace-nowrap text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-primary"
                        >
                            All ({entries.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="character"
                            className="whitespace-nowrap text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-primary"
                        >
                            Characters ({categoryCounts.character || 0})
                        </TabsTrigger>
                        <TabsTrigger
                            value="location"
                            className="whitespace-nowrap text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-primary"
                        >
                            Locations ({categoryCounts.location || 0})
                        </TabsTrigger>
                        <TabsTrigger
                            value="item"
                            className="whitespace-nowrap text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-primary"
                        >
                            Items ({categoryCounts.item || 0})
                        </TabsTrigger>
                        <TabsTrigger
                            value="event"
                            className="whitespace-nowrap text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-primary"
                        >
                            Events ({categoryCounts.event || 0})
                        </TabsTrigger>
                        <TabsTrigger
                            value="note"
                            className="whitespace-nowrap text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-primary"
                        >
                            Notes ({categoryCounts.note || 0})
                        </TabsTrigger>
                        <TabsTrigger
                            value="synopsis"
                            className="whitespace-nowrap text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-primary"
                        >
                            Synopsis ({categoryCounts.synopsis || 0})
                        </TabsTrigger>
                        <TabsTrigger
                            value="starting scenario"
                            className="whitespace-nowrap text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-primary"
                        >
                            Starting ({categoryCounts['starting scenario'] || 0})
                        </TabsTrigger>
                        <TabsTrigger
                            value="timeline"
                            className="whitespace-nowrap text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-primary"
                        >
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
                        <LorebookEntryList entries={filteredEntries} />
                    )}
                </TabsContent>
            </Tabs>

            <CreateEntryDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                storyId={storyId!}
            />
        </div>
    );
} 
