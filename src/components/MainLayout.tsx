import { Link, Outlet, useLocation } from "react-router";
import { Home, BookOpen, Bot, HelpCircle } from "lucide-react";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/stories", icon: BookOpen, label: "Stories" },
    { to: "/ai-settings", icon: Bot, label: "AI" },
    { to: "/guide", icon: HelpCircle, label: "Guide" },
];

export function MainLayout() {
    const isMobile = useIsMobile();
    const location = useLocation();

    // Check if current path matches nav item (handles nested routes)
    const isActive = (path: string) => {
        if (path === "/") return location.pathname === "/";
        return location.pathname.startsWith(path);
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-background">
            {/* Desktop: Fixed Icon Navigation Sidebar */}
            <div className="hidden md:flex w-12 border-r bg-muted/50 flex-col items-center py-4 fixed h-screen">
                {/* Top Navigation Icons */}
                <div className="flex-1 flex flex-col space-y-4">
                    {navItems.map((item) => (
                        <Link key={item.to} to={item.to}>
                            <Button
                                variant={isActive(item.to) ? "secondary" : "ghost"}
                                size="icon"
                                className="h-9 w-9 hover:bg-accent hover:text-accent-foreground"
                            >
                                <item.icon className="h-5 w-5" />
                            </Button>
                        </Link>
                    ))}
                </div>

                {/* Theme Toggle at Bottom */}
                <div className="pb-4">
                    <ThemeToggle />
                </div>
            </div>

            {/* Main Content Area */}
            <div className={cn(
                "flex-1",
                // On mobile: add bottom padding for tab bar
                "pb-16 md:pb-0",
                // On desktop: offset for fixed sidebar
                "md:ml-12"
            )}>
                <Outlet />
            </div>

            {/* Mobile: Bottom Tab Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t flex items-center justify-around px-2 z-50">
                {navItems.map((item) => (
                    <Link
                        key={item.to}
                        to={item.to}
                        className={cn(
                            "flex flex-col items-center justify-center flex-1 h-full py-2 px-1",
                            "text-muted-foreground hover:text-foreground transition-colors",
                            isActive(item.to) && "text-primary"
                        )}
                    >
                        <item.icon className={cn(
                            "h-5 w-5 mb-1",
                            isActive(item.to) && "text-primary"
                        )} />
                        <span className={cn(
                            "text-xs font-medium",
                            isActive(item.to) && "text-primary"
                        )}>
                            {item.label}
                        </span>
                    </Link>
                ))}
                <div className="flex flex-col items-center justify-center py-2 px-1">
                    <ThemeToggle />
                </div>
            </nav>
        </div>
    );
}