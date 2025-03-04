import { Link, Outlet, useParams } from "react-router";
import {
    Settings,
    Home,
    Bot,
    Sparkles,
    Sliders,
    BookOpen,
    Book,
    MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useStoryStore } from "@/features/stories/stores/useStoryStore";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router";

export default function StoryDashboard() {
    const { storyId } = useParams();
    const { getStory } = useStoryStore();
    const location = useLocation();

    useEffect(() => {
        if (storyId) {
            getStory(storyId);
        }
    }, [storyId, getStory]);

    const isActive = (path: string) => {
        const currentPath = location.pathname.replace(/\/$/, '');
        const targetPath = path.replace(/\/$/, '');
        if (currentPath.includes('/write') && targetPath.includes('/chapters')) {
            return true;
        }
        return currentPath === targetPath;
    };

    const navButton = (icon: React.ReactNode, to: string, label: string) => (
        <Button
            variant="ghost"
            size="icon"
            className={cn(
                "h-9 w-9 relative group hover:bg-accent hover:text-accent-foreground",
                isActive(to) && "bg-accent text-accent-foreground"
            )}
            asChild
        >
            <Link to={to}>
                {icon}
                <span className="sr-only">{label}</span>
                <span className="absolute left-12 px-2 py-1 ml-1 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 bg-popover text-popover-foreground rounded shadow-md transition-opacity">
                    {label}
                </span>
            </Link>
        </Button>
    );

    return (
        <div className="h-screen flex bg-background">
            {/* Fixed Icon Navigation */}
            <div className="w-12 border-r bg-muted/50 flex flex-col items-center py-4 fixed h-screen">
                {/* Top Navigation Icons */}
                <div className="flex-1 flex flex-col items-center space-y-4">
                    {storyId && (
                        <>
                            {navButton(<BookOpen className="h-5 w-5" />, `/dashboard/${storyId}/chapters`, "Chapters")}
                            {navButton(<Book className="h-5 w-5" />, `/dashboard/${storyId}/lorebook`, "Lorebook")}
                            {navButton(<Sparkles className="h-5 w-5" />, `/dashboard/${storyId}/prompts`, "Prompts")}
                            {navButton(<MessageSquare className="h-5 w-5" />, `/dashboard/${storyId}/brainstorm`, "Brainstorm")}
                        </>
                    )}
                </div>

                {/* Bottom Navigation */}
                <div className="flex flex-col items-center space-y-4 pb-4">
                    <ThemeToggle />
                    {navButton(<Home className="h-5 w-5" />, "/stories", "Stories")}
                    {navButton(<Sliders className="h-5 w-5" />, "/ai-settings", "AI Settings")}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 ml-12">
                <Outlet />
            </div>
        </div>
    );
}
