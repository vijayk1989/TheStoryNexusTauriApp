import { useEffect, useState } from 'react';
import { Trash2, ChevronDown, ChevronRight, MessageSquare, Clock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStoryContext } from '@/features/stories/context/StoryContext';
import type { AIChat } from '@/types/story';
import { toast } from 'react-toastify';
import { db } from '@/services/database';
import { useQuickChatStore } from '../stores/useQuickChatStore';
import MarkdownRenderer from '@/features/brainstorm/components/MarkdownRenderer';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function ChapterChatsPanel() {
    const { currentStoryId, currentChapterId } = useStoryContext();
    const [chats, setChats] = useState<AIChat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const fetchChats = async () => {
        if (!currentStoryId || !currentChapterId) return;
        setIsLoading(true);
        try {
            const allChats = await db.aiChats
                .where('storyId')
                .equals(currentStoryId)
                .toArray();
            
            // Filter by chapterId and sort by newest first
            const chapterChats = allChats
                .filter(c => c.chapterId === currentChapterId)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            
            setChats(chapterChats);
        } catch (error) {
            console.error("Failed to fetch chapter chats", error);
            toast.error("Failed to load saved chats");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchChats();
        // Set up an interval or listener if needed, but for now fetching on mount is fine.
    }, [currentStoryId, currentChapterId]);

    const toggleExpand = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await db.aiChats.delete(deleteTarget);
            setChats(prev => prev.filter(c => c.id !== deleteTarget));
            setDeleteTarget(null);
            toast.success('Chat deleted');
        } catch (error) {
            console.error("Failed to delete chat", error);
            toast.error("Failed to delete chat");
        }
    };

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
                Loading saved chats…
            </div>
        );
    }

    if (chats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                <MessageSquare className="h-10 w-10 opacity-40" />
                <p className="text-sm">No saved chats for this chapter yet.</p>
                <p className="text-xs text-center px-4">Use the Quick Chat panel and click "Save" to keep your research here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 p-1">
            <div className="text-xs text-muted-foreground mb-2">
                {chats.length} saved chat{chats.length !== 1 ? 's' : ''}
            </div>

            {chats.map((chat) => (
                <ChatCard
                    key={chat.id}
                    chat={chat}
                    expanded={expandedIds.has(chat.id)}
                    onToggle={() => toggleExpand(chat.id)}
                    onDelete={() => setDeleteTarget(chat.id)}
                    formatDate={formatDate}
                />
            ))}

            {/* Delete confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Saved Chat</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this chat. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ── Individual chat card ──────────────────────────────────────

function ChatCard({
    chat,
    expanded,
    onToggle,
    onDelete,
    formatDate,
}: {
    chat: AIChat;
    expanded: boolean;
    onToggle: () => void;
    onDelete: () => void;
    formatDate: (d: Date | string) => string;
}) {
    const { loadChat } = useQuickChatStore();

    return (
        <div className="border rounded-lg bg-card overflow-hidden">
            {/* Header — always visible */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/50 transition-colors"
            >
                {expanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{chat.title}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(chat.updatedAt || chat.createdAt)}
                        </span>
                        <span>{chat.messages.length} messages</span>
                    </div>
                </div>
            </button>

            {/* Expanded body */}
            {expanded && (
                <div className="border-t px-3 pb-3 bg-muted/10">
                    {/* Read-only messages */}
                    <div className="space-y-3 py-3 max-h-[400px] overflow-y-auto pr-2">
                        {chat.messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex flex-col space-y-1 ${
                                    msg.role === "user" ? "items-end" : "items-start"
                                }`}
                            >
                                <div
                                    className={`text-xs px-3 py-2 rounded-md max-w-[90%] ${
                                        msg.role === "user"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted border"
                                    }`}
                                >
                                    {msg.role === "user" ? (
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    ) : (
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <MarkdownRenderer content={msg.content} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t justify-between">
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => loadChat(chat)} 
                            className="text-xs"
                        >
                            <Play className="h-3 w-3 mr-1" />
                            Resume in Quick Chat
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onDelete} className="text-xs text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
