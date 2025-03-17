import { useEffect, useState } from 'react';
import { useNotesStore } from '../stores/useNotesStore';
import Editor from 'react-simple-wysiwyg';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NoteEditorProps {
    storyId: string;
}

export default function NoteEditor({ storyId }: NoteEditorProps) {
    const { selectedNote, updateNote } = useNotesStore();
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (selectedNote) {
            setContent(selectedNote.content);
        } else {
            setContent('');
        }
    }, [selectedNote]);

    const handleSave = async () => {
        if (!selectedNote) return;

        try {
            setIsSaving(true);
            await updateNote(selectedNote.id, { content });
        } finally {
            setIsSaving(false);
        }
    };

    if (!selectedNote) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                <p>Select a note to start editing</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="border-b border-input p-4 flex items-center justify-between">
                <div>
                    <h2 className="font-semibold text-foreground">{selectedNote.title}</h2>
                    <p className="text-sm text-muted-foreground">
                        Last updated: {new Date(selectedNote.updatedAt).toLocaleString()}
                    </p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2"
                >
                    <Save className="h-4 w-4" />
                    Save
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <Editor
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    containerProps={{
                        className: cn(
                            "prose prose-sm max-w-none h-full",
                            "dark:prose-invert"
                        )
                    }}
                />
            </div>
        </div>
    );
} 