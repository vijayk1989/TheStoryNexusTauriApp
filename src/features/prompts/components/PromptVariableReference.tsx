import { useMemo, useState } from "react";
import { Check, Copy, Search, Variable } from "lucide-react";
import { toast } from "react-toastify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PromptVariable {
    token: string;
    label: string;
    description: string;
    availability: string[];
}

interface PromptVariableGroup {
    name: string;
    variables: PromptVariable[];
}

const VARIABLE_GROUPS: PromptVariableGroup[] = [
    {
        name: "Scene Beat",
        variables: [
            {
                token: "{{scenebeat}}",
                label: "Scene beat",
                description: "The current scene beat command.",
                availability: ["Scene Beat"],
            },
            {
                token: "{{scenebeat_context}}",
                label: "Scene beat context",
                description: "Selected lorebook context for the scene beat.",
                availability: ["Scene Beat"],
            },
            {
                token: "{{lorebook_scenebeat_matched_entries}}",
                label: "Scene beat lorebook matches",
                description: "Lorebook entries matched against the scene beat text.",
                availability: ["Scene Beat"],
            },
        ],
    },
    {
        name: "Chapter Context",
        variables: [
            {
                token: "{{chapter_content}}",
                label: "Current chapter",
                description: "The full text of the current chapter.",
                availability: ["Editor"],
            },
            {
                token: "{{chapter_outline}}",
                label: "Chapter outline",
                description: "The outline for the current chapter.",
                availability: ["Editor"],
            },
            {
                token: "{{previous_words(1000)}}",
                label: "Previous words",
                description: "Words before the cursor. Change the number as needed.",
                availability: ["Editor"],
            },
            {
                token: "{{after_words(500)}}",
                label: "After words",
                description: "Words after the cursor, when available.",
                availability: ["Editor"],
            },
            {
                token: "{{summaries}}",
                label: "Previous summaries",
                description: "Summaries for chapters before the current chapter.",
                availability: ["Story"],
            },
            {
                token: "{{all_previous_chapters}}",
                label: "All previous chapters",
                description: "Full text from every chapter before the current chapter.",
                availability: ["Story"],
            },
            {
                token: "{{previous_chapter(2)}}",
                label: "Previous chapters",
                description: "Full text from previous chapters. Change the number as needed.",
                availability: ["Story"],
            },
            {
                token: "{{chapter_data(2)}}",
                label: "Chapter by number",
                description: "Full text for a specific chapter number.",
                availability: ["Story"],
            },
        ],
    },
    {
        name: "Timeline",
        variables: [
            {
                token: "{{timeline}}",
                label: "Timeline",
                description: "Timeline events up to the current chapter.",
                availability: ["Timeline"],
            },
            {
                token: "{{timeline_up_to_current_chapter}}",
                label: "Timeline up to current chapter",
                description: "Timeline events up to and including the current chapter.",
                availability: ["Timeline"],
            },
            {
                token: "{{timeline_current_chapter}}",
                label: "Current chapter timeline",
                description: "Timeline events attached to the current chapter.",
                availability: ["Timeline"],
            },
            {
                token: "{{all_timelines}}",
                label: "All timelines",
                description: "Alias for timeline events up to the current chapter.",
                availability: ["Timeline"],
            },
        ],
    },
    {
        name: "Lorebook",
        variables: [
            {
                token: "{{matched_entries_chapter}}",
                label: "Chapter lorebook matches",
                description: "Lorebook entries matched against the current chapter.",
                availability: ["Lorebook"],
            },
            {
                token: "{{lorebook_chapter_matched_entries}}",
                label: "Chapter lorebook matches alias",
                description: "Alias for chapter lorebook matches.",
                availability: ["Lorebook"],
            },
            {
                token: "{{lorebook_data}}",
                label: "Lorebook data alias",
                description: "Alias for chapter lorebook matches.",
                availability: ["Lorebook"],
            },
            {
                token: "{{lorebook_update_targets}}",
                label: "Lorebook update targets",
                description: "Entries selected as targets for lorebook update prompts.",
                availability: ["Lorebook"],
            },
            {
                token: "{{lorebook Entry Name}}",
                label: "Lorebook entry by name or alias",
                description: "A specific lorebook entry from any category by name or alias.",
                availability: ["Lorebook"],
            },
            {
                token: "{{all_entries}}",
                label: "All lorebook entries",
                description: "All enabled lorebook entries for the story.",
                availability: ["Lorebook"],
            },
            {
                token: "{{all_characters}}",
                label: "All characters",
                description: "All character entries from the lorebook.",
                availability: ["Lorebook"],
            },
            {
                token: "{{all_locations}}",
                label: "All locations",
                description: "All location entries from the lorebook.",
                availability: ["Lorebook"],
            },
            {
                token: "{{all_items}}",
                label: "All items",
                description: "All item entries from the lorebook.",
                availability: ["Lorebook"],
            },
            {
                token: "{{all_events}}",
                label: "All events",
                description: "All event entries from the lorebook.",
                availability: ["Lorebook"],
            },
            {
                token: "{{all_notes}}",
                label: "All notes",
                description: "All note entries from the lorebook.",
                availability: ["Lorebook"],
            },
            {
                token: "{{all_synopsis}}",
                label: "All synopsis entries",
                description: "All synopsis entries from the lorebook.",
                availability: ["Lorebook"],
            },
            {
                token: "{{all_starting_scenarios}}",
                label: "All starting scenarios",
                description: "All starting scenario entries from the lorebook.",
                availability: ["Lorebook"],
            },
            {
                token: "{{character Alias}}",
                label: "Character by name or alias",
                description: "A specific character entry by name or alias.",
                availability: ["Lorebook"],
            },
        ],
    },
    {
        name: "Selection",
        variables: [
            {
                token: "{{selected_text}}",
                label: "Selected text",
                description: "Text currently selected in the editor.",
                availability: ["Editor"],
            },
            {
                token: "{{selection}}",
                label: "Selection alias",
                description: "Alias for selected text.",
                availability: ["Editor"],
            },
        ],
    },
    {
        name: "Brainstorm",
        variables: [
            {
                token: "{{brainstorm_context}}",
                label: "Brainstorm context",
                description: "Selected context from the Brainstorm panel.",
                availability: ["Brainstorm"],
            },
            {
                token: "{{user_input}}",
                label: "User input",
                description: "The active brainstorm topic or image prompt input.",
                availability: ["Brainstorm", "Image"],
            },
            {
                token: "{{chat_history}}",
                label: "Chat history",
                description: "Current brainstorm conversation history.",
                availability: ["Brainstorm"],
            },
        ],
    },
    {
        name: "Story Metadata",
        variables: [
            {
                token: "{{pov}}",
                label: "Point of view",
                description: "The current point of view character and type.",
                availability: ["Story"],
            },
            {
                token: "{{story_language}}",
                label: "Story language",
                description: "The configured language for the story.",
                availability: ["Story"],
            },
        ],
    },
];

export function PromptVariableReference() {
    const [search, setSearch] = useState("");
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    const filteredGroups = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return VARIABLE_GROUPS;

        return VARIABLE_GROUPS
            .map((group) => ({
                ...group,
                variables: group.variables.filter((variable) => {
                    const searchable = [
                        group.name,
                        variable.token,
                        variable.label,
                        variable.description,
                        ...variable.availability,
                    ].join(" ").toLowerCase();

                    return searchable.includes(query);
                }),
            }))
            .filter((group) => group.variables.length > 0);
    }, [search]);

    const handleCopy = async (token: string) => {
        try {
            await navigator.clipboard.writeText(token);
            setCopiedToken(token);
            toast.success("Variable copied");
            window.setTimeout(() => setCopiedToken(null), 1200);
        } catch (error) {
            console.error("Failed to copy prompt variable:", error);
            toast.error("Failed to copy variable");
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="gap-2">
                    <Variable className="h-4 w-4" />
                    Variables
                </Button>
            </DialogTrigger>
            <DialogContent className="flex h-[82vh] max-w-3xl flex-col gap-4 p-0">
                <DialogHeader className="border-b px-6 pb-4 pt-6">
                    <DialogTitle>Prompt Variables</DialogTitle>
                    <DialogDescription>
                        Search available prompt variables and copy the ones you need.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search variables"
                            className="pl-9"
                        />
                    </div>
                </div>

                <ScrollArea className="min-h-0 flex-1 px-6 pb-6">
                    <div className="space-y-6">
                        {filteredGroups.map((group) => (
                            <section key={group.name} className="space-y-2">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {group.name}
                                </h3>
                                <div className="divide-y rounded-md border">
                                    {group.variables.map((variable) => (
                                        <div
                                            key={`${group.name}-${variable.token}`}
                                            className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                                        >
                                            <div className="min-w-0 space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <code className="break-all rounded bg-muted px-2 py-1 text-xs">
                                                        {variable.token}
                                                    </code>
                                                    {variable.availability.map((item) => (
                                                        <Badge key={item} variant="secondary" className="text-[10px]">
                                                            {item}
                                                        </Badge>
                                                    ))}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{variable.label}</p>
                                                    <p className="text-xs text-muted-foreground">{variable.description}</p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 justify-self-end"
                                                onClick={() => handleCopy(variable.token)}
                                                title={`Copy ${variable.token}`}
                                            >
                                                {copiedToken === variable.token ? (
                                                    <Check className="h-4 w-4 text-primary" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}

                        {filteredGroups.length === 0 && (
                            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                                No variables found.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
