import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, Edit2, Plus, Trash2 } from "lucide-react";
import { useBrainstormStore } from "../stores/useBrainstormStore";
import ChatInterface from "./ChatInterface";
import type { AIChat } from "@/types/story";
import { toast } from "react-toastify";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function BrainstormPanel({ storyId }: { storyId: string }) {
    const { chats, selectedChat, fetchChats, createNewChat, selectChat, updateChat, deleteChat } = useBrainstormStore();
    const [editingChat, setEditingChat] = useState<AIChat | null>(null);
    const [chatTitle, setChatTitle] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<AIChat | null>(null);

    useEffect(() => {
        fetchChats(storyId);
    }, [storyId, fetchChats]);

    const openRenameDialog = (chat: AIChat) => {
        setEditingChat(chat);
        setChatTitle(chat.title);
    };

    const handleRename = async () => {
        if (!editingChat || !chatTitle.trim()) return;

        try {
            await updateChat(editingChat.id, { title: chatTitle.trim() });
            toast.success("Chat renamed");
            setEditingChat(null);
            setChatTitle("");
        } catch (error) {
            toast.error("Failed to rename chat");
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        try {
            await deleteChat(deleteTarget.id);
            toast.success("Chat deleted");
            setDeleteTarget(null);
        } catch (error) {
            toast.error("Failed to delete chat");
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 p-2 border-b">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className="min-w-0 flex-1 justify-between"
                        >
                            <span className="truncate">
                                {selectedChat?.title || "Select a chat"}
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] max-h-[360px] overflow-y-auto">
                        {chats.length === 0 && (
                            <DropdownMenuItem disabled>No chats yet</DropdownMenuItem>
                        )}
                        {chats.map(chat => (
                            <DropdownMenuItem
                                key={chat.id}
                                className="group flex items-center gap-2 pr-2"
                                onSelect={() => selectChat(chat)}
                            >
                                <Check
                                    className={cn(
                                        "h-4 w-4 shrink-0 text-primary",
                                        selectedChat?.id === chat.id ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm">{chat.title}</div>
                                    <div className="text-[11px] text-muted-foreground">
                                        {new Date(chat.updatedAt || chat.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                    title="Rename chat"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        openRenameDialog(chat);
                                    }}
                                >
                                    <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    title="Delete chat"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        setDeleteTarget(chat);
                                    }}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="icon" onClick={() => createNewChat(storyId)} title="New Chat">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            <div className="flex-1 overflow-hidden">
                {selectedChat ? (
                    <ChatInterface storyId={storyId} />
                ) : (
                    <div className="flex items-center justify-center h-full flex-col gap-4 text-muted-foreground p-4 text-center">
                        <p>No chat selected. Select an existing chat or create a new one.</p>
                        <Button onClick={() => createNewChat(storyId)}>Start New Brainstorm</Button>
                    </div>
                )}
            </div>

            <Dialog open={!!editingChat} onOpenChange={(open) => !open && setEditingChat(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Chat</DialogTitle>
                    </DialogHeader>
                    <Input
                        value={chatTitle}
                        onChange={(event) => setChatTitle(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") handleRename();
                        }}
                        placeholder="Chat title"
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingChat(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleRename} disabled={!chatTitle.trim()}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete "{deleteTarget?.title}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
