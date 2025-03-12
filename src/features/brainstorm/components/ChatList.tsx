import { useState, useEffect } from 'react';
import { useBrainstormStore } from '../stores/useBrainstormStore';
import { cn } from '@/lib/utils';
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';

interface ChatListProps {
    storyId: string;
}

export default function ChatList({ storyId }: ChatListProps) {
    const { chats, fetchChats, selectedChat, selectChat, deleteChat, createNewChat } = useBrainstormStore();
    const [isCollapsed, setIsCollapsed] = useState(false);

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

    return (
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
                                Create Your First Chat
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
                                    className="flex justify-between items-start"
                                >
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm block truncate text-foreground">{chat.title}</span>
                                        <span className="text-xs text-muted-foreground block mt-1">
                                            {new Date(chat.updatedAt || chat.createdAt).toLocaleDateString()} {new Date(chat.updatedAt || chat.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteChat(chat.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                    </Button>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
} 