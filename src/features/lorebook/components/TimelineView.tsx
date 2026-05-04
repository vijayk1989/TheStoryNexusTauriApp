import { LorebookEntry } from "@/types/story";
import { useLorebookStore } from "../stores/useLorebookStore";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface TimelineViewProps {
    entries: LorebookEntry[];
}

export function TimelineView({ entries }: TimelineViewProps) {
    const { entries: allEntries } = useLorebookStore();

    // Sort entries by chapter order
    const sortedEntries = [...entries].sort((a, b) => {
        const orderA = a.metadata?.chapterOrder ?? 0;
        const orderB = b.metadata?.chapterOrder ?? 0;
        return orderA - orderB;
    });

    if (sortedEntries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <Clock className="w-12 h-12 mb-4 opacity-50" />
                <p>No timeline events yet.</p>
                <p className="text-sm">Use the "Extract Timeline" button in the chapter editor to generate events.</p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-[calc(100vh-250px)] pr-4">
            <div className="relative border-l-2 border-primary/30 ml-4 md:ml-6 space-y-8 pb-8">
                {sortedEntries.map((entry) => {
                    const participantIds = entry.metadata?.participantIds || [];
                    const participants = participantIds
                        .map(id => allEntries.find(e => e.id === id)?.name)
                        .filter(Boolean) as string[];

                    return (
                        <div key={entry.id} className="relative pl-6 md:pl-8">
                            <div className="absolute -left-[9px] top-2 h-4 w-4 rounded-full bg-primary ring-4 ring-background" />
                            <Card className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start gap-4">
                                        <CardTitle className="text-lg">{entry.name}</CardTitle>
                                        <Badge variant="outline" className="shrink-0 bg-background">
                                            Chapter {entry.metadata?.chapterOrder ?? "?"}
                                        </Badge>
                                    </div>
                                    <CardDescription className="text-foreground mt-2">
                                        {entry.description}
                                    </CardDescription>
                                </CardHeader>
                                {participants.length > 0 && (
                                    <CardContent className="pt-0">
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {participants.map((name, i) => (
                                                <Badge key={i} variant="secondary" className="text-xs">
                                                    {name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>
    );
}
