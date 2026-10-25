import { Copy, Download } from "lucide-react";
import { Button } from "./button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./dropdown-menu";
import { toast } from "react-toastify";
import { downloadChapter, downloadStory } from "@/utils/exportUtils";
import { copyChapterToClipboard } from "@/utils/chapterClipboard";

interface DownloadMenuProps {
    type: 'story' | 'chapter';
    id: string;
    variant?: "outline" | "ghost" | "link" | "default" | "destructive" | "secondary";
    size?: "default" | "sm" | "lg" | "icon";
    showIcon?: boolean;
    label?: string;
    className?: string;
}

export function DownloadMenu({
    type,
    id,
    variant = "ghost",
    size = "icon",
    showIcon = true,
    label = "Download",
    className = "",
}: DownloadMenuProps) {
    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await copyChapterToClipboard(id);
            toast.success('Chapter copied to clipboard', {
                position: "bottom-center",
                autoClose: 2000,
            });
        } catch (error) {
            console.error('Failed to copy chapter:', error);
            toast.error('Could not copy chapter. Please try again.', {
                position: "bottom-center",
                autoClose: 2000,
            });
        }
    };

    const handleDownload = async (format: 'html' | 'text', e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            if (type === 'story') {
                await downloadStory(id, format);
            } else {
                await downloadChapter(id, format);
            }
            toast.success(`${type === 'story' ? 'Story' : 'Chapter'} downloaded as ${format.toUpperCase()}`, {
                position: "bottom-center",
                autoClose: 2000,
            });
        } catch (error) {
            console.error(`Failed to download ${type}:`, error);
            toast.error(`Failed to download ${type}`, {
                position: "bottom-center",
                autoClose: 2000,
            });
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={variant} size={size} className={`flex items-center gap-1 ${className}`}>
                    {showIcon && <Download className="h-4 w-4" />}
                    {(size !== "icon" || !showIcon) && label}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => handleDownload('html', e)}>
                    Download as HTML
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleDownload('text', e)}>
                    Download as Text
                </DropdownMenuItem>
                {type === 'chapter' && (
                    <DropdownMenuItem onClick={handleCopy}>
                        <Copy className="h-4 w-4" />
                        Copy to clipboard
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
