import { useState, useEffect } from 'react';
import { useBrainstormStore } from '../stores/useBrainstormStore';
import { cn } from '@/lib/utils';
import { Plus, Trash2, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AIChat } from '@/types/story';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from '@/hooks/use-mobile';

interface ChatListProps {
    storyId: string;
    onChatSelect?: () => void;
}

export default function ChatList({ storyId, onChatSelect }: ChatListProps) {
    const { chats, fetchChats, selectedChat, selectChat, deleteChat, createNewChat, updateChat } = useBrainstormStore();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingChat, setEditingChat] = useState<AIChat | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const isMobile = useIsMobile();

    useEffect(() => {
        if (storyId) {
            fetchChats(storyId);
        }
    }, [fetchChats, storyId]);

    const handleDeleteChat = async (chatId: string) => {
        try {
            await deleteChat(chatId);
            toast.success('Chat deleted successfully');
        } catch (error) {
            toast.error('Failed to delete chat');
        }
    };

    const handleEditClick = (chat: AIChat, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingChat(chat);
        setNewTitle(chat.title);
        setIsEditDialogOpen(true);
    };

    const handleSaveTitle = async () => {
        if (editingChat && newTitle.trim()) {
            try {
                await updateChat(editingChat.id, { title: newTitle.trim() });
                toast.success('Chat renamed successfully');
                setIsEditDialogOpen(false);
                setEditingChat(null);
                setNewTitle('');
            } catch (error) {
                toast.error('Failed to rename chat');
            }
        }
    };

    const handleSelectChat = (chat: AIChat) => {
        selectChat(chat);
        onChatSelect?.();
    };

    // On mobile, render without the collapse functionality (used inside Sheet)
    if (isMobile) {
        return (
            <>
                <div className="h-full flex flex-col bg-background">
                    <div className="p-4 border-b border-input">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                createNewChat(storyId);
                                onChatSelect?.();
                            }}
                            className="w-full flex items-center gap-1"
                        >
                            <Plus className="h-4 w-4" />
                            New Chat
                        </Button>
                    </div>
                    <ul className="overflow-y-auto flex-1">
                        {chats.length === 0 ? (
                            <li className="p-8 flex flex-col items-center justify-center text-center">
                                <p className="text-muted-foreground mb-4">No chats yet</p>
                            </li>
                        ) : (
                            chats.map((chat) => (
                                <li
                                    key={chat.id}
                                    className={cn(
                                        "p-4 border-b border-input hover:bg-muted cursor-pointer relative group",
                                        selectedChat?.id === chat.id && "bg-muted/50"
                                    )}
                                    onClick={() => handleSelectChat(chat)}
                                >
                                    <div className="flex flex-col gap-2">
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm block truncate text-foreground">{chat.title}</span>
                                            <span className="text-xs text-muted-foreground block mt-1">
                                                {new Date(chat.updatedAt || chat.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => handleEditClick(chat, e)}
                                                className="h-8 w-8"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteChat(chat.id);
                                                }}
                                                className="h-8 w-8 hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                {/* Edit Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Rename Chat</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <Input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Enter new title"
                                className="w-full"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSaveTitle();
                                    }
                                }}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveTitle} disabled={!newTitle.trim()}>
                                Save
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    // Desktop layout with collapsible sidebar
    return (
        <>
            <div className={cn(
                "relative border-r border-input bg-background transition-all duration-300",
                isCollapsed ? "w-[40px]" : "w-[250px] sm:w-[300px]"
            )}>
                {/* Toggle button */}
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

                {/* Chat list content */}
                <div className={cn(
                    "h-full overflow-y-auto",
                    isCollapsed ? "hidden" : "block"
                )}>
                    <div className="p-4 border-b border-input">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-semibold text-foreground">Brainstorm History</h2>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => createNewChat(storyId)}
                                className="flex items-center gap-1"
                            >
                                <Plus className="h-4 w-4" />
                                New Chat
                            </Button>
                        </div>
                    </div>
                    <ul className="overflow-y-auto flex-1">
                        {chats.length === 0 ? (
                            <li className="p-8 flex flex-col items-center justify-center text-center">
                                <p className="text-muted-foreground mb-4">No chats yet</p>
                                <Button
                                    onClick={() => createNewChat(storyId)}
                                    className="flex items-center gap-1"
                                >
                                    <Plus className="h-4 w-4" />
                                    Start New Chat
                                </Button>
                            </li>
                        ) : (
                            chats.map((chat) => (
                                <li
                                    key={chat.id}
                                    className={cn(
                                        "p-4 border-b border-input hover:bg-muted cursor-pointer relative group",
                                        selectedChat?.id === chat.id && "bg-muted/50"
                                    )}
                                >
                                    <div
                                        onClick={() => selectChat(chat)}
                                        className="flex flex-col gap-2"
                                    >
                                        {/* Title and timestamp with tooltip */}
                                        <div className="flex-1 min-w-0">
                                            <TooltipProvider delayDuration={100}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-sm block truncate text-foreground">{chat.title}</span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="max-w-xs break-words">{chat.title}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <span className="text-xs text-muted-foreground block mt-1">
                                                {new Date(chat.updatedAt || chat.createdAt).toLocaleDateString()} {new Date(chat.updatedAt || chat.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditClick(chat, e);
                                                }}
                                                className="h-8 w-8"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteChat(chat.id);
                                                }}
                                                className="h-8 w-8 hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Chat</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Enter new title"
                            className="w-full"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSaveTitle();
                                }
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsEditDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveTitle}
                            disabled={!newTitle.trim()}
                        >
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
} 