import { Link, Outlet, useParams } from "react-router";
import {
    Settings,
    Home,
    Bot,
    Sparkles,
    Sliders,
    BookOpen,
    Book,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    StickyNote,
    PenLine,
    Menu,
    Workflow
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useStoryStore } from "@/features/stories/stores/useStoryStore";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import { useIsMobile } from "@/hooks/use-mobile";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

export default function StoryDashboard() {
    const { storyId } = useParams();
    const { getStory, currentStory } = useStoryStore();
    const location = useLocation();
    const isMobile = useIsMobile();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(() => {
        // Initialize from localStorage if available
        const savedState = localStorage.getItem('nav-expanded');
        return savedState ? JSON.parse(savedState) : false;
    });

    const { getLastEditedChapterId, chapters } = useChapterStore();

    // Check if the last edited chapter still exists
    const lastEditedChapterId = storyId ? getLastEditedChapterId(storyId) : null;
    const lastEditedChapterExists = lastEditedChapterId && chapters.some(chapter => chapter.id === lastEditedChapterId);

    useEffect(() => {
        if (storyId) {
            getStory(storyId);
        }
    }, [storyId, getStory]);

    // Save navigation state to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('nav-expanded', JSON.stringify(isExpanded));
    }, [isExpanded]);

    const toggleSidebar = () => {
        setIsExpanded(!isExpanded);
    };

    const isActive = (path: string) => {
        const currentPath = location.pathname.replace(/\/$/, '');
        const targetPath = path.replace(/\/$/, '');
        if (currentPath.includes('/write') && targetPath.includes('/chapters')) {
            return true;
        }
        return currentPath === targetPath;
    };

    const navButton = (icon: React.ReactNode, to: string, label: string, closeMobileNav = true) => (
        <Button
            variant="ghost"
            size={isExpanded || isMobile ? "default" : "icon"}
            className={cn(
                "relative group hover:bg-accent hover:text-accent-foreground transition-all",
                (isExpanded || isMobile) ? "justify-start w-full px-3" : "h-9 w-9",
                isActive(to) && "bg-accent text-accent-foreground"
            )}
            asChild
            onClick={() => closeMobileNav && isMobile && setMobileNavOpen(false)}
        >
            <Link to={to}>
                <div className="flex items-center">
                    {icon}
                    {(isExpanded || isMobile) ? (
                        <span className="ml-2">{label}</span>
                    ) : (
                        <>
                            <span className="sr-only">{label}</span>
                            <span className="absolute left-12 px-2 py-1 ml-1 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 bg-popover text-popover-foreground rounded shadow-md transition-opacity">
                                {label}
                            </span>
                        </>
                    )}
                </div>
            </Link>
        </Button>
    );

    const navContent = (
        <>
            {/* Top Navigation Icons */}
            <div className={cn(
                "flex-1 flex flex-col space-y-2",
                (isExpanded || isMobile) ? "items-start px-2" : "items-center"
            )}>
                {storyId && (
                    <>
                        {navButton(<BookOpen className="h-5 w-5" />, `/dashboard/${storyId}/chapters`, "Chapters")}
                        {lastEditedChapterId && lastEditedChapterExists && (
                            navButton(
                                <PenLine className="h-5 w-5" />,
                                `/dashboard/${storyId}/chapters/${lastEditedChapterId}`,
                                "Last Edited"
                            )
                        )}
                        {navButton(<Book className="h-5 w-5" />, `/dashboard/${storyId}/lorebook`, "Lorebook")}
                        {navButton(<Sparkles className="h-5 w-5" />, `/dashboard/${storyId}/prompts`, "Prompts")}
                        {navButton(<Workflow className="h-5 w-5" />, `/dashboard/${storyId}/agents`, "Agents")}
                        {navButton(<MessageSquare className="h-5 w-5" />, `/dashboard/${storyId}/brainstorm`, "Brainstorm")}
                        {navButton(<StickyNote className="h-5 w-5" />, `/dashboard/${storyId}/notes`, "Notes")}
                    </>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className={cn(
                "flex flex-col space-y-2 pb-4",
                (isExpanded || isMobile) ? "items-start px-2" : "items-center"
            )}>
                {!isMobile && <ThemeToggle isExpanded={isExpanded} />}
                {navButton(<Home className="h-5 w-5" />, "/stories", "Stories")}
                {navButton(<Sliders className="h-5 w-5" />, "/ai-settings", "AI Settings")}
            </div>
        </>
    );

    // Mobile layout
    if (isMobile) {
        return (
            <div className="h-full flex flex-col bg-background">
                {/* Mobile Header with hamburger */}
                <div className="h-14 border-b flex items-center px-4 gap-3 flex-shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileNavOpen(true)}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                    <span className="font-semibold truncate">
                        {currentStory?.title || "Story"}
                    </span>
                </div>

                {/* Mobile Navigation Sheet */}
                <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                    <SheetContent side="left" className="w-[280px] p-0">
                        <SheetHeader className="p-4 border-b">
                            <SheetTitle className="truncate">{currentStory?.title || "Navigation"}</SheetTitle>
                        </SheetHeader>
                        <div className="flex flex-col h-[calc(100%-65px)] py-4">
                            {navContent}
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Main Content Area */}
                <div className="flex-1 overflow-auto">
                    <Outlet />
                </div>
            </div>
        );
    }

    // Desktop layout
    return (
        <div className="h-screen flex bg-background">
            {/* Fixed Navigation Sidebar */}
            <div
                className={cn(
                    "border-r bg-muted/50 flex flex-col py-4 fixed h-screen transition-all duration-300 ease-in-out",
                    isExpanded ? "w-[150px]" : "w-12"
                )}
            >
                {/* Toggle Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className="self-end mb-4 mr-1"
                >
                    {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>

                {navContent}
            </div>

            {/* Main Content Area */}
            <div className={cn(
                "flex-1 transition-all duration-300 ease-in-out",
                isExpanded ? "ml-[150px]" : "ml-12"
            )}>
                <Outlet />
            </div>
        </div>
    );
}
