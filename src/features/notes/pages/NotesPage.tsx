import { useState } from 'react';
import { useParams } from 'react-router';
import NoteList from '../components/NoteList';
import NoteEditor from '../components/NoteEditor';
import { useNotesStore } from '../stores/useNotesStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Menu, StickyNote, Plus } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

export default function NotesPage() {
    const { storyId } = useParams();
    const { selectedNote } = useNotesStore();
    const isMobile = useIsMobile();
    const [mobileListOpen, setMobileListOpen] = useState(false);

    if (!storyId) {
        return <div>Story ID is required</div>;
    }

    const handleNoteSelect = () => {
        setMobileListOpen(false);
    };

    // Mobile layout
    if (isMobile) {
        return (
            <div className="h-full flex flex-col">
                {/* Mobile Header */}
                <div className="h-14 border-b flex items-center px-4 gap-3 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setMobileListOpen(true)}>
                        <Menu className="h-5 w-5" />
                    </Button>
                    <span className="font-semibold truncate">
                        {selectedNote?.title || 'Notes'}
                    </span>
                </div>

                {/* Mobile Notes List Sheet */}
                <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
                    <SheetContent side="left" className="w-[300px] p-0">
                        <SheetHeader className="p-4 border-b">
                            <SheetTitle>Notes</SheetTitle>
                        </SheetHeader>
                        <div className="h-[calc(100%-65px)]">
                            <NoteList storyId={storyId} onNoteSelect={handleNoteSelect} />
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Mobile Content */}
                <div className="flex-1 overflow-hidden">
                    {selectedNote ? (
                        <NoteEditor storyId={storyId} />
                    ) : (
                        <div className="flex items-center justify-center h-full flex-col gap-6 text-muted-foreground p-4">
                            <StickyNote className="h-16 w-16 text-muted-foreground/50" />
                            <div className="text-center max-w-md">
                                <h3 className="text-xl font-semibold mb-2">No Note Selected</h3>
                                <p className="mb-6">Select a note from the list or create a new one.</p>
                                <Button
                                    variant="outline"
                                    onClick={() => setMobileListOpen(true)}
                                >
                                    <Menu className="h-4 w-4 mr-2" />
                                    View Notes List
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Desktop layout
    return (
        <div className="h-full flex">
            <NoteList storyId={storyId} />
            <div className="flex-1">
                <NoteEditor storyId={storyId} />
            </div>
        </div>
    );
} 