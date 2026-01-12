import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";

interface ResponsiveSidebarProps {
    children: React.ReactNode;
    /** Title shown in Sheet header on mobile */
    title?: string;
    /** Width when expanded on desktop (default: 250px) */
    width?: string;
    /** Width when collapsed on desktop (default: 40px) */
    collapsedWidth?: string;
    /** Side for mobile sheet (default: left) */
    side?: "left" | "right";
    /** Whether the sidebar can be collapsed on desktop */
    collapsible?: boolean;
    /** External control for mobile sheet open state */
    open?: boolean;
    /** Callback when mobile sheet open state changes */
    onOpenChange?: (open: boolean) => void;
    /** Additional class names for the sidebar container */
    className?: string;
    /** Whether to show the mobile trigger button (default: true) */
    showMobileTrigger?: boolean;
    /** Custom trigger button for mobile */
    mobileTrigger?: React.ReactNode;
}

interface ResponsiveSidebarContextValue {
    isMobile: boolean;
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

const ResponsiveSidebarContext = React.createContext<ResponsiveSidebarContextValue | null>(null);

export function useResponsiveSidebar() {
    const context = React.useContext(ResponsiveSidebarContext);
    if (!context) {
        throw new Error("useResponsiveSidebar must be used within ResponsiveSidebar");
    }
    return context;
}

export function ResponsiveSidebar({
    children,
    title = "Menu",
    width = "250px",
    collapsedWidth = "40px",
    side = "left",
    collapsible = true,
    open,
    onOpenChange,
    className,
    showMobileTrigger = true,
    mobileTrigger,
}: ResponsiveSidebarProps) {
    const isMobile = useIsMobile();
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [internalOpen, setInternalOpen] = React.useState(false);

    const isOpen = open ?? internalOpen;
    const setIsOpen = onOpenChange ?? setInternalOpen;

    const contextValue = React.useMemo(
        () => ({
            isMobile,
            isCollapsed,
            setIsCollapsed,
            isOpen,
            setIsOpen,
        }),
        [isMobile, isCollapsed, isOpen, setIsOpen]
    );

    // Mobile: Render as Sheet
    if (isMobile) {
        return (
            <ResponsiveSidebarContext.Provider value={contextValue}>
                {showMobileTrigger && !mobileTrigger && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden fixed top-3 left-3 z-40"
                        onClick={() => setIsOpen(true)}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                )}
                {mobileTrigger}
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetContent side={side} className="w-[300px] p-0">
                        <SheetHeader className="p-4 border-b">
                            <SheetTitle>{title}</SheetTitle>
                        </SheetHeader>
                        <div className="flex-1 overflow-y-auto">
                            {children}
                        </div>
                    </SheetContent>
                </Sheet>
            </ResponsiveSidebarContext.Provider>
        );
    }

    // Desktop: Render as collapsible sidebar
    return (
        <ResponsiveSidebarContext.Provider value={contextValue}>
            <div
                className={cn(
                    "relative border-r border-input bg-background transition-all duration-300 flex-shrink-0",
                    className
                )}
                style={{ width: isCollapsed ? collapsedWidth : width }}
            >
                {collapsible && (
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="absolute -right-3 top-1/2 transform -translate-y-1/2 z-10 
                            bg-background border-input border rounded-full p-1 shadow-sm hover:bg-muted"
                    >
                        {isCollapsed ? (
                            <ChevronRight className="h-4 w-4 text-foreground" />
                        ) : (
                            <ChevronLeft className="h-4 w-4 text-foreground" />
                        )}
                    </button>
                )}
                <div className={cn(
                    "h-full overflow-y-auto",
                    isCollapsed && collapsible ? "hidden" : "block"
                )}>
                    {children}
                </div>
            </div>
        </ResponsiveSidebarContext.Provider>
    );
}

/** 
 * Mobile trigger component that can be placed anywhere in the layout
 * to open the responsive sidebar sheet
 */
interface MobileSidebarTriggerProps {
    onClick: () => void;
    className?: string;
    children?: React.ReactNode;
}

export function MobileSidebarTrigger({ onClick, className, children }: MobileSidebarTriggerProps) {
    const isMobile = useIsMobile();
    
    if (!isMobile) return null;
    
    return (
        <Button
            variant="ghost"
            size="icon"
            className={cn("md:hidden", className)}
            onClick={onClick}
        >
            {children ?? <Menu className="h-5 w-5" />}
        </Button>
    );
}
