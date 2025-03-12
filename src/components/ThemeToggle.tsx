import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme-provider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
    isExpanded?: boolean;
}

export function ThemeToggle({ isExpanded = false }: ThemeToggleProps) {
    const { theme, setTheme } = useTheme();

    return (
        <Button
            variant="ghost"
            size={isExpanded ? "default" : "icon"}
            className={cn(
                "relative hover:bg-accent hover:text-accent-foreground",
                isExpanded ? "justify-start w-full px-3" : "h-9 w-9"
            )}
            onClick={() => {
                const newTheme = theme === "light" ? "dark" : "light";
                setTheme(newTheme);
            }}
        >
            <div className="flex items-center">
                {theme === "light" ? (
                    <Sun className="h-5 w-5" />
                ) : (
                    <Moon className="h-5 w-5" />
                )}
                {isExpanded && <span className="ml-2">Theme</span>}
            </div>
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
} 