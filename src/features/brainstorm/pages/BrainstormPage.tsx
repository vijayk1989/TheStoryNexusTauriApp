import { useState } from 'react';
import { useParams } from 'react-router';
import ChatList from '../components/ChatList';
import ChatInterface from '../components/ChatInterface';
import { useBrainstormStore } from '../stores/useBrainstormStore';
import { MessageSquarePlus, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

export default function BrainstormPage() {
    const { storyId } = useParams<{ storyId: string }>();
    const { selectedChat, createNewChat } = useBrainstormStore();
    const isMobile = useIsMobile();
    const [mobileListOpen, setMobileListOpen] = useState(false);

    if (!storyId) {
        return <div>Story ID not found</div>;
    }

    const handleChatSelect = () => {
        setMobileListOpen(false);
    };

    // Mobile layout
    if (isMobile) {
        return (
            <div className="flex flex-col h-full">
                {/* Mobile Header */}
                <div className="h-14 border-b flex items-center px-4 gap-3 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setMobileListOpen(true)}>
                        <Menu className="h-5 w-5" />
                    </Button>
                    <span className="font-semibold truncate">
                        {selectedChat?.title || 'Brainstorm'}
                    </span>
                </div>

                {/* Mobile Chat List Sheet */}
                <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
                    <SheetContent side="left" className="w-[300px] p-0">
                        <SheetHeader className="p-4 border-b">
                            <SheetTitle>Brainstorm Chats</SheetTitle>
                        </SheetHeader>
                        <div className="h-[calc(100%-65px)]">
                            <ChatList storyId={storyId} onChatSelect={handleChatSelect} />
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Mobile Content */}
                <div className="flex-1 overflow-hidden">
                    {selectedChat ? (
                        <ChatInterface storyId={storyId} />
                    ) : (
                        <div className="flex items-center justify-center h-full flex-col gap-6 text-muted-foreground p-4">
                            <MessageSquarePlus className="h-16 w-16 text-muted-foreground/50" />
                            <div className="text-center max-w-md">
                                <h3 className="text-xl font-semibold mb-2">No Chat Selected</h3>
                                <p className="mb-6">Select an existing chat from the sidebar or create a new one.</p>
                                <div className="flex flex-col gap-3">
                                    <Button
                                        onClick={() => createNewChat(storyId)}
                                        className="flex items-center gap-2"
                                    >
                                        <MessageSquarePlus className="h-4 w-4" />
                                        Create New Chat
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setMobileListOpen(true)}
                                    >
                                        <Menu className="h-4 w-4 mr-2" />
                                        View Chat List
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Desktop layout
    return (
        <div className="flex h-full">
            <ChatList storyId={storyId} />
            <div className="flex-1 h-full">
                {selectedChat ? (
                    <ChatInterface storyId={storyId} />
                ) : (
                    <div className="flex items-center justify-center h-full flex-col gap-6 text-muted-foreground p-4">
                        <MessageSquarePlus className="h-16 w-16 text-muted-foreground/50" />
                        <div className="text-center max-w-md">
                            <h3 className="text-xl font-semibold mb-2">No Chat Selected</h3>
                            <p className="mb-6">Select an existing chat from the sidebar or create a new one to start brainstorming ideas for your story.</p>
                            <Button
                                onClick={() => createNewChat(storyId)}
                                className="flex items-center gap-2"
                            >
                                <MessageSquarePlus className="h-4 w-4" />
                                Create New Chat
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 