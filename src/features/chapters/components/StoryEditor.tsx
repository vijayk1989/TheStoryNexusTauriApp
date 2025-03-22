import { useState } from "react";
import { BookOpen, Tags, Maximize, Minimize, User, Download, StickyNote } from "lucide-react";
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
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

type DrawerType = "matchedTags" | "chapterOutline" | "chapterPOV" | "chapterNotes" | null;

export function StoryEditor() {
    const [openDrawer, setOpenDrawer] = useState<DrawerType>(null);
    const [isMaximized, setIsMaximized] = useState(false);
    const { currentChapterId } = useStoryContext();

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

    return (
        <div className="h-full flex">
            {/* Main Editor Area */}
            <div className={`flex-1 flex justify-center ${isMaximized ? '' : 'px-4'}`}>
                <div className={`h-full flex flex-col ${isMaximized ? 'w-full' : 'max-w-[1024px] w-full'}`}>
                    <EmbeddedPlayground maximizeButton={maximizeButton} />
                </div>
            </div>

            {/* Right Sidebar with Buttons */}
            <div className="w-48 border-l h-full flex flex-col py-4 space-y-2 bg-muted/20">
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
            </div>

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

            {/* Replace the Chapter Notes Drawer with this Sheet */}
            <Sheet open={openDrawer === "chapterNotes"} onOpenChange={(open) => !open && setOpenDrawer(null)}>
                <SheetContent
                    side="right"
                    className="h-[100vh] min-w-[800px]"
                >
                    <SheetHeader>
                        <SheetTitle>Scribble</SheetTitle>
                    </SheetHeader>
                    <div className="overflow-y-auto h-[100vh]">
                        <ChapterNotesEditor onClose={() => setOpenDrawer(null)} />
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
