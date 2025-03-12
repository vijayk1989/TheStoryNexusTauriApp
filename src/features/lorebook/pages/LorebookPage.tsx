import { useEffect } from "react";
import { useParams } from "react-router";
import { useLorebookStore } from "../stores/useLorebookStore";
import { CreateEntryDialog } from "../components/CreateEntryDialog";
import { LorebookEntryList } from "../components/LorebookEntryList";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function LorebookPage() {
    const { storyId } = useParams<{ storyId: string }>();
    const { loadEntries, entries, isLoading, error, buildTagMap } = useLorebookStore();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("all");

    useEffect(() => {
        if (storyId) {
            loadEntries(storyId).then(() => {
                buildTagMap();
            });
        }
    }, [storyId, loadEntries, buildTagMap]);

    const categoryCounts = entries.reduce((acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    if (error) {
        return (
            <div className="p-4">
                <p className="text-destructive">Error loading lorebook: {error}</p>
            </div>
        );
    }

    const filteredEntries = activeTab === "all"
        ? entries
        : entries.filter(entry => entry.category === activeTab);

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Lorebook</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your story's characters, locations, and other important elements
                    </p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Entry
                </Button>
            </div>

            <Separator />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start">
                    <TabsTrigger value="all">
                        All ({entries.length})
                    </TabsTrigger>
                    <TabsTrigger value="character">
                        Characters ({categoryCounts.character || 0})
                    </TabsTrigger>
                    <TabsTrigger value="location">
                        Locations ({categoryCounts.location || 0})
                    </TabsTrigger>
                    <TabsTrigger value="item">
                        Items ({categoryCounts.item || 0})
                    </TabsTrigger>
                    <TabsTrigger value="event">
                        Events ({categoryCounts.event || 0})
                    </TabsTrigger>
                    <TabsTrigger value="note">
                        Notes ({categoryCounts.note || 0})
                    </TabsTrigger>
                    <TabsTrigger value="synopsis">
                        Synopsis ({categoryCounts.synopsis || 0})
                    </TabsTrigger>
                    <TabsTrigger value="starting scenario">
                        Starting Scenario ({categoryCounts['starting scenario'] || 0})
                    </TabsTrigger>
                    <TabsTrigger value="timeline">
                        Timeline ({categoryCounts.timeline || 0})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
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