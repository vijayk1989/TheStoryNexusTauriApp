import { useState } from "react";
import { BookOpen, Tags, Maximize, Minimize, User, Download, StickyNote, MoreVertical, ArrowLeft, FileText, Settings, HelpCircle, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmbeddedPlayground from "@/Lexical/lexical-playground/src/EmbeddedPlayground";
import { MatchedTagEntries } from "@/features/chapters/components/MatchedTagEntries";
import { ChapterOutline } from "./ChapterOutline";
import { ChapterPOVEditor } from "@/features/chapters/components/ChapterPOVEditor";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { DownloadMenu } from "@/components/ui/DownloadMenu";
import { ChapterNotesEditor } from "@/features/chapters/components/ChapterNotesEditor";
import { DraftsPanel } from "@/features/drafts/components/DraftsPanel";
import { AISettingsPanel } from "@/features/ai/components/AISettingsPanel";
import { PromptsPanel } from "@/features/prompts/components/PromptsPanel";
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router";

type DrawerType = "matchedTags" | "chapterOutline" | "chapterPOV" | "chapterNotes" | "drafts" | "aiSettings" | "guide" | "prompts" | null;

export function StoryEditor() {
    const [openDrawer, setOpenDrawer] = useState<DrawerType>(null);
    const [isMaximized, setIsMaximized] = useState(false);
    const { currentChapterId, currentStoryId } = useStoryContext();
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    const handleOpenDrawer = (drawer: DrawerType) => {
        setOpenDrawer(drawer === openDrawer ? null : drawer);
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

    // Sidebar content for both desktop and mobile dropdown
    const sidebarButtons = (
        <>
            <Button
                variant={openDrawer === "matchedTags" ? "default" : "outline"}
                size="sm"
                className="mx-2 justify-start"
                onClick={() => handleOpenDrawer("matchedTags")}
            >
                <Tags className="h-4 w-4 mr-2" />
                Matched Tags
            </Button>

            <Button
                variant={openDrawer === "chapterOutline" ? "default" : "outline"}
                size="sm"
                className="mx-2 justify-start"
                onClick={() => handleOpenDrawer("chapterOutline")}
            >
                <BookOpen className="h-4 w-4 mr-2" />
                Outline
            </Button>

            <Button
                variant={openDrawer === "chapterPOV" ? "default" : "outline"}
                size="sm"
                className="mx-2 justify-start"
                onClick={() => handleOpenDrawer("chapterPOV")}
            >
                <User className="h-4 w-4 mr-2" />
                Edit POV
            </Button>

            <Button
                variant={openDrawer === "chapterNotes" ? "default" : "outline"}
                size="sm"
                className="mx-2 justify-start"
                onClick={() => handleOpenDrawer("chapterNotes")}
            >
                <StickyNote className="h-4 w-4 mr-2" />
                Chapter Notes
            </Button>

            {currentChapterId && (
                <DownloadMenu
                    type="chapter"
                    id={currentChapterId}
                    variant="outline"
                    size="sm"
                    showIcon={true}
                    label="Download"
                    className="mx-2 justify-start"
                />
            )}

            <Button
                variant={openDrawer === "drafts" ? "default" : "outline"}
                size="sm"
                className="mx-2 justify-start"
                onClick={() => handleOpenDrawer("drafts")}
            >
                <FileText className="h-4 w-4 mr-2" />
                Drafts
            </Button>

            <Button
                variant={openDrawer === "aiSettings" ? "default" : "outline"}
                size="sm"
                className="mx-2 justify-start"
                onClick={() => handleOpenDrawer("aiSettings")}
            >
                <Settings className="h-4 w-4 mr-2" />
                AI Settings
            </Button>

            <Button
                variant={openDrawer === "guide" ? "default" : "outline"}
                size="sm"
                className="mx-2 justify-start"
                onClick={() => handleOpenDrawer("guide")}
            >
                <HelpCircle className="h-4 w-4 mr-2" />
                Guide
            </Button>

            <Button
                variant={openDrawer === "prompts" ? "default" : "outline"}
                size="sm"
                className="mx-2 justify-start"
                onClick={() => handleOpenDrawer("prompts")}
            >
                <ScrollText className="h-4 w-4 mr-2" />
                Prompts
            </Button>
        </>
    );

    return (
        <div className="h-full flex relative overflow-hidden">
            {/* Main Editor Area */}
            <div className={`flex-1 flex justify-center overflow-hidden min-w-0 ${isMaximized ? '' : 'px-2 md:px-4'}`}>
                <div className={`h-full flex flex-col min-w-0 ${isMaximized ? 'w-full' : 'max-w-[1024px] w-full'}`}>
                    <EmbeddedPlayground maximizeButton={maximizeButton} />
                </div>
            </div>

            {/* Desktop: Right Sidebar with Buttons */}
            <div className="hidden md:flex w-48 border-l h-full flex-col py-4 space-y-2 bg-muted/20 flex-shrink-0">
                {sidebarButtons}
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
                        <DropdownMenuItem onClick={() => navigate(`/dashboard/${currentStoryId}/chapters`)}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Chapters
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleOpenDrawer("matchedTags")}>
                            <Tags className="h-4 w-4 mr-2" />
                            Matched Tags
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenDrawer("chapterOutline")}>
                            <BookOpen className="h-4 w-4 mr-2" />
                            Outline
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenDrawer("chapterPOV")}>
                            <User className="h-4 w-4 mr-2" />
                            Edit POV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenDrawer("chapterNotes")}>
                            <StickyNote className="h-4 w-4 mr-2" />
                            Chapter Notes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenDrawer("drafts")}>
                            <FileText className="h-4 w-4 mr-2" />
                            Drafts
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenDrawer("aiSettings")}>
                            <Settings className="h-4 w-4 mr-2" />
                            AI Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenDrawer("guide")}>
                            <HelpCircle className="h-4 w-4 mr-2" />
                            Guide
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenDrawer("prompts")}>
                            <ScrollText className="h-4 w-4 mr-2" />
                            Prompts
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {/* Matched Tags Drawer */}
            <Drawer open={openDrawer === "matchedTags"} onOpenChange={(open) => !open && setOpenDrawer(null)}>
                <DrawerContent className="max-h-[80vh]">
                    <DrawerHeader>
                        <DrawerTitle>Matched Tag Entries</DrawerTitle>
                        <DrawerDescription>
                            Lorebook entries that match tags in your current chapter.
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="px-4 overflow-y-auto max-h-[60vh]">
                        <MatchedTagEntries />
                    </div>
                    <DrawerFooter>
                        <DrawerClose asChild>
                            <Button variant="outline">Close</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>

            {/* Chapter Outline Drawer */}
            <Drawer open={openDrawer === "chapterOutline"} onOpenChange={(open) => !open && setOpenDrawer(null)}>
                <DrawerContent className="max-h-[80vh]">
                    <DrawerHeader>
                        <DrawerTitle>Chapter Outline</DrawerTitle>
                        <DrawerDescription>
                            Outline and notes for your current chapter.
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="px-4 overflow-y-auto max-h-[60vh]">
                        <ChapterOutline />
                    </div>
                    <DrawerFooter>
                        <DrawerClose asChild>
                            <Button variant="outline">Close</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>

            {/* Chapter POV Drawer */}
            <Drawer open={openDrawer === "chapterPOV"} onOpenChange={(open) => !open && setOpenDrawer(null)}>
                <DrawerContent className="max-h-[80vh]">
                    <DrawerHeader>
                        <DrawerTitle>Edit Chapter POV</DrawerTitle>
                        <DrawerDescription>
                            Change the point of view character and perspective for this chapter.
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="px-4 overflow-y-auto max-h-[60vh]">
                        <ChapterPOVEditor onClose={() => setOpenDrawer(null)} />
                    </div>
                    <DrawerFooter>
                        <DrawerClose asChild>
                            <Button variant="outline">Close</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>

            {/* Chapter Notes Sheet - responsive width */}
            <Sheet open={openDrawer === "chapterNotes"} onOpenChange={(open) => !open && setOpenDrawer(null)}>
                <SheetContent
                    side="right"
                    className="h-[100vh] w-full md:min-w-[800px] md:w-auto"
                >
                    <SheetHeader>
                        <SheetTitle>Scribble</SheetTitle>
                    </SheetHeader>
                    <div className="overflow-y-auto h-[100vh]">
                        <ChapterNotesEditor onClose={() => setOpenDrawer(null)} />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Drafts Sheet */}
            <Sheet open={openDrawer === "drafts"} onOpenChange={(open) => !open && setOpenDrawer(null)}>
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
            <Sheet open={openDrawer === "aiSettings"} onOpenChange={(open) => !open && setOpenDrawer(null)}>
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
            <Sheet open={openDrawer === "guide"} onOpenChange={(open) => !open && setOpenDrawer(null)}>
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

            {/* Prompts Sheet */}
            <Sheet open={openDrawer === "prompts"} onOpenChange={(open) => !open && setOpenDrawer(null)}>
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
        </div>
    );
}
