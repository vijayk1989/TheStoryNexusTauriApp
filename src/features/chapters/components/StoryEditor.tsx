import { useState, useCallback, useRef } from "react";
import { BookOpen, Maximize, Minimize, User, Download, StickyNote, MoreVertical, FileText, Settings, HelpCircle, ScrollText, Book, Microscope, Loader2, Check, Settings2, Clock, MessageSquarePlus, Bot, ImageIcon } from "lucide-react";
import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import { Button } from "@/components/ui/button";
import { MainLexicalEditor } from "@/components/editor/mainLexicalEditor";
import { ChapterOutline } from "./ChapterOutline";
import { ChapterPOVEditor } from "@/features/chapters/components/ChapterPOVEditor";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { DownloadMenu } from "@/components/ui/DownloadMenu";
import { ChapterNotesEditor } from "@/features/chapters/components/ChapterNotesEditor";
import { DraftsPanel } from "@/features/drafts/components/DraftsPanel";
import { AIEditorialPanel } from "@/features/chapters/components/AIEditorialPanel";
import { AISettingsPanel } from "@/features/ai/components/AISettingsPanel";
import { PromptsPanel } from "@/features/prompts/components/PromptsPanel";
import { PromptDefaultsPanel } from "@/features/prompts/components/PromptDefaultsPanel";
import { BrainstormPanel } from "@/features/brainstorm/components/BrainstormPanel";
import { LorebookPanel } from "@/features/lorebook/components/LorebookPanel";
import { AgentsManager } from "@/features/agents/components/AgentsManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BasicsGuide from "@/features/guide/components/BasicsGuide";
import AdvancedGuide from "@/features/guide/components/AdvancedGuide";
import LorebookGuide from "@/features/guide/components/LorebookGuide";
import PromptGuide from "@/features/guide/components/PromptGuide";
import BrainstormGuide from "@/features/guide/components/BrainstormGuide";
import AgenticGuide from "@/features/guide/components/AgenticGuide";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TimelineExtractionDialog } from "@/features/chapters/components/TimelineExtractionDialog";
import { ImageGalleryPanel } from "@/features/images/components/ImageGalleryPanel";

type ToolPanelType = "chapterOutline" | "chapterPOV" | "chapterNotes" | "drafts" | "aiSettings" | "guide" | "prompts" | "lorebook" | "agents" | "promptDefaults" | "brainstorm" | "imageGallery" | "chapterReview" | null;

export function StoryEditor() {
    const [openPanel, setOpenPanel] = useState<ToolPanelType>(null);
    const [isMaximized, setIsMaximized] = useState(false);
    const EDITORIAL_WIDTH_KEY = 'editorial-panel-width';
    const [editorialWidth, setEditorialWidth] = useState(() => {
        try {
            const saved = localStorage.getItem(EDITORIAL_WIDTH_KEY);
            if (saved) {
                const n = parseInt(saved, 10);
                if (!isNaN(n) && n >= 320) return Math.min(n, window.innerWidth - 80);
            }
        } catch { /* localStorage unavailable */ }
        return Math.round(window.innerWidth * 0.6);
    });
    const dragWidthRef = useRef(editorialWidth);
    const [isTimelineDialogOpen, setIsTimelineDialogOpen] = useState(false);
    const { currentChapterId, currentStoryId } = useStoryContext();
    const saveStatus = useChapterStore((s) => s.saveStatus);
    const isMobile = useIsMobile();

    const startEditorialDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        const el = e.currentTarget;
        el.setPointerCapture(e.pointerId);
        const startX = e.clientX;
        const startWidth = editorialWidth;
        const onPointerMove = (ev: PointerEvent) => {
            // dragging left increases width (panel is on the right)
            const next = Math.min(
                Math.max(startWidth + (startX - ev.clientX), 320),
                window.innerWidth - 80
            );
            dragWidthRef.current = next;
            setEditorialWidth(next);
        };
        const onPointerUp = (ev: PointerEvent) => {
            el.releasePointerCapture(ev.pointerId);
            el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', onPointerUp);
            try { localStorage.setItem(EDITORIAL_WIDTH_KEY, String(dragWidthRef.current)); } catch { /* ignore */ }
        };
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
    }, [editorialWidth]);

    const handleExtractTimeline = () => {
        if (!currentStoryId || !currentChapterId) return;
        setIsTimelineDialogOpen(true);
    };

    const handleOpenPanel = (panel: ToolPanelType) => {
        setOpenPanel(panel === openPanel ? null : panel);
    };

    const toggleMaximize = () => {
        setIsMaximized(!isMaximized);
    };

    const maximizeButton = (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleMaximize}
            title={isMaximized ? "Minimize Editor" : "Maximize Editor"}
        >
            {isMaximized ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
    );

    const saveIndicator = saveStatus === 'saving' ? (
        <span className="flex items-center gap-1 text-xs text-muted-foreground px-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving…
        </span>
    ) : saveStatus === 'saved' ? (
        <span className="flex items-center gap-1 text-xs text-green-600 px-2">
            <Check className="h-3 w-3" />
            Saved
        </span>
    ) : null;

    // Sidebar content for both desktop and mobile dropdown
    const sidebarButtons = (
        <>
            <Button
                variant={openPanel === "chapterOutline" ? "default" : "outline"}
                size="sm"
                className="justify-start w-full"
                onClick={() => handleOpenPanel("chapterOutline")}
            >
                <BookOpen className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">Outline</span>
            </Button>

            <Button
                variant={openPanel === "chapterPOV" ? "default" : "outline"}
                size="sm"
                className="justify-start w-full"
                onClick={() => handleOpenPanel("chapterPOV")}
            >
                <User className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">Edit Chapter POV</span>
            </Button>

            <Button
                variant="outline"
                size="sm"
                className="justify-start w-full"
                onClick={handleExtractTimeline}
                disabled={!currentChapterId}
            >
                <Clock className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">Extract Timeline</span>
            </Button>

            <Button
                variant={openPanel === "chapterNotes" ? "default" : "outline"}
                size="sm"
                className="justify-start w-full"
                onClick={() => handleOpenPanel("chapterNotes")}
            >
                <StickyNote className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">Chapter Notes</span>
            </Button>

            {currentChapterId && (
                <DownloadMenu
                    type="chapter"
                    id={currentChapterId}
                    variant="outline"
                    size="sm"
                    showIcon={true}
                    label="Download"
                    className="justify-start w-full"
                />
            )}

            <Button
                variant={openPanel === "drafts" ? "default" : "outline"}
                size="sm"
                className="justify-start w-full"
                onClick={() => handleOpenPanel("drafts")}
            >
                <FileText className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">Drafts</span>
            </Button>

            <Button
                variant={openPanel === "brainstorm" ? "default" : "outline"}
                size="sm"
                className="justify-start w-full"
                onClick={() => handleOpenPanel("brainstorm")}
            >
                <MessageSquarePlus className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">Brainstorm</span>
            </Button>

            <Button
                variant={openPanel === "imageGallery" ? "default" : "outline"}
                size="sm"
                className="justify-start w-full"
                onClick={() => handleOpenPanel("imageGallery")}
            >
                <ImageIcon className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">Images</span>
            </Button>

            <Button
                variant={openPanel === "chapterReview" ? "default" : "outline"}
                size="sm"
                className="justify-start w-full"
                onClick={() => handleOpenPanel("chapterReview")}
            >
                <Microscope className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">AI Editorial</span>
            </Button>

            <Button
                variant={openPanel === "lorebook" ? "default" : "outline"}
                size="sm"
                className="justify-start w-full"
                onClick={() => handleOpenPanel("lorebook")}
            >
                <Book className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">Lorebook</span>
            </Button>

            <Button
                variant={openPanel === "agents" ? "default" : "outline"}
                size="sm"
                className="justify-start w-full"
                onClick={() => handleOpenPanel("agents")}
            >
                <Bot className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">Agents</span>
            </Button>

            <Button
                variant={openPanel === "prompts" ? "default" : "outline"}
                size="sm"
                className="justify-start w-full"
                onClick={() => handleOpenPanel("prompts")}
            >
                <ScrollText className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">Prompts</span>
            </Button>

            <Button
                variant={openPanel === "promptDefaults" ? "default" : "outline"}
                size="sm"
                className="justify-start w-full"
                onClick={() => handleOpenPanel("promptDefaults")}
            >
                <Settings2 className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">Prompt Defaults</span>
            </Button>

            <Button
                variant={openPanel === "aiSettings" ? "default" : "outline"}
                size="sm"
                className="justify-start w-full"
                onClick={() => handleOpenPanel("aiSettings")}
            >
                <Settings className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">AI Settings</span>
            </Button>
            
             <Button
                variant={openPanel === "guide" ? "default" : "outline"}
                size="sm"
                className="justify-start w-full"
                onClick={() => handleOpenPanel("guide")}
            >
                <HelpCircle className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">Guide</span>
            </Button>
        </>
    );

    return (
        <div className="flex min-h-screen bg-background">
            {/* Main Editor Area */}
            <div className={`flex-1 flex justify-center min-w-0 ${isMaximized ? '' : 'px-2 md:px-6'}`}>
                <div className={`min-w-0 ${isMaximized ? 'w-full' : 'max-w-[1200px] w-full'}`}>
                    <MainLexicalEditor maximizeButton={maximizeButton} />
                </div>
            </div>

            {/* Desktop: Right Sidebar with Tools */}
            <div className="sticky top-0 hidden h-screen w-80 flex-shrink-0 flex-col border-l border-border bg-surface md:flex">
                {saveIndicator && (
                    <div className="px-3 py-2 border-b">
                        {saveIndicator}
                    </div>
                )}
                <div className="grid grid-cols-2 gap-2 overflow-y-auto p-3">
                    {sidebarButtons}
                </div>
            </div>

            {/* Mobile: Floating Action Button with Dropdown */}
            {isMobile && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="default"
                            size="icon"
                            className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full shadow-lg"
                        >
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="top" className="w-48">
                        <DropdownMenuItem onClick={() => handleOpenPanel("chapterOutline")}>
                            <BookOpen className="h-4 w-4 mr-2" />
                            Outline
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenPanel("chapterPOV")}>
                            <User className="h-4 w-4 mr-2" />
                            Edit Chapter POV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenPanel("chapterNotes")}>
                            <StickyNote className="h-4 w-4 mr-2" />
                            Chapter Notes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenPanel("drafts")}>
                            <FileText className="h-4 w-4 mr-2" />
                            Drafts
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenPanel("brainstorm")}>
                            <MessageSquarePlus className="h-4 w-4 mr-2" />
                            Brainstorm
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenPanel("imageGallery")}>
                            <ImageIcon className="h-4 w-4 mr-2" />
                            Images
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenPanel("lorebook")}>
                            <Book className="h-4 w-4 mr-2" />
                            Lorebook
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenPanel("agents")}>
                            <Bot className="h-4 w-4 mr-2" />
                            Agents
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenPanel("prompts")}>
                            <ScrollText className="h-4 w-4 mr-2" />
                            Prompts
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenPanel("chapterReview")}>
                            <Microscope className="h-4 w-4 mr-2" />
                            AI Editorial
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenPanel("promptDefaults")}>
                            <Settings2 className="h-4 w-4 mr-2" />
                            Prompt Defaults
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenPanel("aiSettings")}>

                            <Settings className="h-4 w-4 mr-2" />
                            AI Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenPanel("guide")}>
                            <HelpCircle className="h-4 w-4 mr-2" />
                            Guide
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {/* Chapter Outline Sheet */}
            <Sheet open={openPanel === "chapterOutline"} onOpenChange={(open) => !open && setOpenPanel(null)}>
                <SheetContent
                    side="right"
                    className="h-[100vh] w-full md:min-w-[500px] md:w-auto"
                >
                    <SheetHeader>
                        <SheetTitle>Chapter Outline</SheetTitle>
                    </SheetHeader>
                    <div className="overflow-y-auto h-[calc(100vh-80px)] px-2 pt-2">
                        <ChapterOutline />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Chapter POV Sheet */}
            <Sheet open={openPanel === "chapterPOV"} onOpenChange={(open) => !open && setOpenPanel(null)}>
                <SheetContent
                    side="right"
                    className="h-[100vh] w-full md:min-w-[500px] md:w-auto"
                >
                    <SheetHeader>
                        <SheetTitle>Edit Chapter POV</SheetTitle>
                    </SheetHeader>
                    <div className="overflow-y-auto h-[calc(100vh-80px)] px-2 pt-2">
                        <ChapterPOVEditor onClose={() => setOpenPanel(null)} />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Chapter Notes Sheet - responsive width */}
            <Sheet open={openPanel === "chapterNotes"} onOpenChange={(open) => !open && setOpenPanel(null)}>
                <SheetContent
                    side="right"
                    className="h-[100vh] w-full md:min-w-[800px] md:w-auto"
                >
                    <SheetHeader>
                        <SheetTitle>Scribble</SheetTitle>
                    </SheetHeader>
                    <div className="overflow-y-auto h-[100vh]">
                        <ChapterNotesEditor onClose={() => setOpenPanel(null)} />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Drafts Sheet */}
            <Sheet open={openPanel === "drafts"} onOpenChange={(open) => !open && setOpenPanel(null)}>
                <SheetContent
                    side="right"
                    className="h-[100vh] w-full md:min-w-[500px] md:w-auto"
                >
                    <SheetHeader>
                        <SheetTitle>Drafts</SheetTitle>
                    </SheetHeader>
                    <div className="overflow-y-auto h-[calc(100vh-80px)] px-2">
                        <DraftsPanel />
                    </div>
                </SheetContent>
            </Sheet>

            {/* AI Settings Sheet */}
            <Sheet open={openPanel === "aiSettings"} onOpenChange={(open) => !open && setOpenPanel(null)}>
                <SheetContent
                    side="right"
                    className="h-[100vh] w-full md:min-w-[500px] md:w-auto"
                >
                    <SheetHeader>
                        <SheetTitle>AI Settings</SheetTitle>
                    </SheetHeader>
                    <div className="overflow-y-auto h-[calc(100vh-80px)] px-2 pt-2">
                        <AISettingsPanel />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Guide Sheet */}
            <Sheet open={openPanel === "guide"} onOpenChange={(open) => !open && setOpenPanel(null)}>
                <SheetContent
                    side="right"
                    className="h-[100vh] w-full md:min-w-[700px] md:w-auto"
                >
                    <SheetHeader>
                        <SheetTitle>The Story Nexus Guide</SheetTitle>
                    </SheetHeader>
                    <div className="overflow-y-auto h-[calc(100vh-80px)] px-2 pt-2">
                        <Tabs defaultValue="basics" className="w-full">
                            <div className="overflow-x-auto -mx-2 px-2">
                                <TabsList className="inline-flex w-max mb-4">
                                    <TabsTrigger value="basics" className="text-xs">Basics</TabsTrigger>
                                    <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
                                    <TabsTrigger value="lorebook" className="text-xs">Lorebook</TabsTrigger>
                                    <TabsTrigger value="prompts" className="text-xs">Prompts</TabsTrigger>
                                    <TabsTrigger value="agentic" className="text-xs">Agentic</TabsTrigger>
                                    <TabsTrigger value="brainstorm" className="text-xs">Brainstorm</TabsTrigger>
                                </TabsList>
                            </div>
                            <TabsContent value="basics"><BasicsGuide /></TabsContent>
                            <TabsContent value="advanced"><AdvancedGuide /></TabsContent>
                            <TabsContent value="lorebook"><LorebookGuide /></TabsContent>
                            <TabsContent value="prompts"><PromptGuide /></TabsContent>
                            <TabsContent value="agentic"><AgenticGuide /></TabsContent>
                            <TabsContent value="brainstorm"><BrainstormGuide /></TabsContent>
                        </Tabs>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Lorebook Sheet */}
            <Sheet open={openPanel === "lorebook"} onOpenChange={(open) => !open && setOpenPanel(null)}>
                <SheetContent
                    side="right"
                    className="h-[100vh] w-full md:min-w-[600px] md:w-auto"
                >
                    <SheetHeader>
                        <SheetTitle>Lorebook</SheetTitle>
                    </SheetHeader>
                    <div className="overflow-y-auto h-[calc(100vh-80px)] px-2 pt-2">
                        <LorebookPanel />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Agents Sheet */}
            <Sheet open={openPanel === "agents"} onOpenChange={(open) => !open && setOpenPanel(null)}>
                <SheetContent
                    side="right"
                    className="flex h-[100vh] w-full flex-col overflow-hidden md:min-w-[800px] md:w-auto lg:min-w-[960px] p-0"
                >
                    <SheetHeader className="sr-only">
                        <SheetTitle>Agents</SheetTitle>
                    </SheetHeader>
                    <AgentsManager />
                </SheetContent>
            </Sheet>

            {/* Prompts Sheet */}
            <Sheet open={openPanel === "prompts"} onOpenChange={(open) => !open && setOpenPanel(null)}>
                <SheetContent
                    side="right"
                    className="h-[100vh] w-full md:min-w-[600px] md:w-auto"
                >
                    <SheetHeader>
                        <SheetTitle>Prompts</SheetTitle>
                    </SheetHeader>
                    <div className="overflow-y-auto h-[calc(100vh-80px)] px-2 pt-2">
                        <PromptsPanel />
                    </div>
                </SheetContent>
            </Sheet>

            {/* AI Editorial Sheet */}
            <Sheet open={openPanel === "chapterReview"} onOpenChange={(open) => { if (!open) { setOpenPanel(null); } }}>
                <SheetContent
                    side="right"
                    className="h-[100vh] w-full max-w-none overflow-hidden"
                    style={{ width: `${editorialWidth}px`, maxWidth: 'none' }}
                >
                    {/* Drag handle on the left edge */}
                    <div
                        className="absolute left-0 top-0 bottom-0 w-3 cursor-col-resize z-10 bg-border/30 hover:bg-primary/40 active:bg-primary/60 transition-colors"
                        onPointerDown={startEditorialDrag}
                    />
                    <SheetHeader>
                        <SheetTitle>AI Editorial</SheetTitle>
                    </SheetHeader>
                    <div className="overflow-y-auto h-[calc(100vh-80px)] px-4 pt-2">
                        <AIEditorialPanel
                            isExpanded={editorialWidth > 750}
                            onExpandChange={(expand) =>
                                setEditorialWidth(expand
                                    ? Math.round(window.innerWidth * 0.9)
                                    : Math.round(window.innerWidth * 0.6)
                                )
                            }
                        />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Prompt Defaults Sheet */}
            <Sheet open={openPanel === "promptDefaults"} onOpenChange={(open) => !open && setOpenPanel(null)}>
                <SheetContent
                    side="right"
                    className="h-[100vh] w-full md:min-w-[500px] md:w-auto"
                >
                    <SheetHeader>
                        <SheetTitle>Prompt Defaults</SheetTitle>
                    </SheetHeader>
                    <div className="overflow-y-auto h-[calc(100vh-80px)] px-2 pt-2">
                        <PromptDefaultsPanel />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Brainstorm Sheet */}
            <Sheet open={openPanel === "brainstorm"} onOpenChange={(open) => !open && setOpenPanel(null)}>
                <SheetContent
                    side="right"
                    className="h-[100vh] w-full md:min-w-[600px] lg:min-w-[800px] md:w-auto p-0"
                >
                    <div className="h-full flex flex-col pt-6">
                        <SheetHeader className="px-4 pb-2 border-b flex-shrink-0 text-left">
                            <SheetTitle>Brainstorm</SheetTitle>
                        </SheetHeader>
                        <div className="flex-1 overflow-hidden">
                            {currentStoryId ? <BrainstormPanel storyId={currentStoryId} /> : null}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Image Gallery Sheet */}
            <Sheet open={openPanel === "imageGallery"} onOpenChange={(open) => !open && setOpenPanel(null)}>
                <SheetContent
                    side="right"
                    className="h-[100vh] w-full md:min-w-[560px] md:w-auto p-0"
                >
                    <div className="h-full flex flex-col pt-6">
                        <SheetHeader className="px-4 pb-2 border-b flex-shrink-0 text-left">
                            <SheetTitle>Images</SheetTitle>
                        </SheetHeader>
                        <div className="flex-1 overflow-y-auto">
                            <ImageGalleryPanel />
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {currentStoryId && currentChapterId && (
                <TimelineExtractionDialog
                    isOpen={isTimelineDialogOpen}
                    onClose={() => setIsTimelineDialogOpen(false)}
                    storyId={currentStoryId}
                    chapterId={currentChapterId}
                />
            )}
        </div>
    );
}