import { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useBrainstormStore } from "../stores/useBrainstormStore";
import ChatInterface from "./ChatInterface";

export function BrainstormPanel({ storyId }: { storyId: string }) {
    const { chats, selectedChat, fetchChats, createNewChat, selectChat } = useBrainstormStore();

    useEffect(() => {
        fetchChats(storyId);
    }, [storyId, fetchChats]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 p-2 border-b">
                <Select 
                    value={selectedChat?.id || ""} 
                    onValueChange={(val) => {
                        const chat = chats.find(c => c.id === val);
                        if (chat) selectChat(chat);
                    }}
                >
                    <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a chat" />
                    </SelectTrigger>
                    <SelectContent>
                        {chats.map(chat => (
                            <SelectItem key={chat.id} value={chat.id}>
                                {chat.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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
        </div>
    );
}
