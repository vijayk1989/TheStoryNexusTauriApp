import { useEffect, useState, useCallback } from 'react';
import { attemptPromise } from '@jfdi/attempt';
import { useChapterStore } from '../stores/useChapterStore';
import Editor from 'react-simple-wysiwyg';
import { cn } from '@/lib/utils';
import type { ChapterNotes } from '@/types/story';
import debounce from 'lodash/debounce';

interface ChapterNotesEditorProps {
    onClose: () => void;
}

export function ChapterNotesEditor({ onClose: _onClose }: ChapterNotesEditorProps) {
    const { currentChapter, updateChapterNotes } = useChapterStore();
    const [content, setContent] = useState('');
    const [lastSavedContent, setLastSavedContent] = useState('');

    // Create a debounced save function
    const debouncedSave = useCallback(
        debounce(async (newContent: string) => {
            if (!currentChapter) return;

            const notes: ChapterNotes = {
                content: newContent,
                lastUpdated: new Date()
            };

            const [error] = await attemptPromise(async () =>
                updateChapterNotes(currentChapter.id, notes)
            );

            if (error) {
                console.error('Failed to save notes:', error);
                return;
            }

            setLastSavedContent(newContent);
        }, 1000),
        [currentChapter]
    );

    useEffect(() => {
        if (currentChapter?.notes) {
            setContent(currentChapter.notes.content);
            setLastSavedContent(currentChapter.notes.content);
        } else {
            setContent('');
            setLastSavedContent('');
        }
    }, [currentChapter]);

    useEffect(() => {
        if (content !== lastSavedContent) {
            debouncedSave(content);
        }
    }, [content, lastSavedContent, debouncedSave]);

    useEffect(() => {
        return () => {
            debouncedSave.cancel();
        };
    }, [debouncedSave]);

    if (!currentChapter) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                <p>No chapter selected</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                {currentChapter?.notes && (
                    <p className="text-sm text-muted-foreground">
                        Last updated: {new Date(currentChapter.notes.lastUpdated).toLocaleString()}
                    </p>
                )}
            </div>
            <Editor
                value={content}
                onChange={(e) => setContent(e.target.value)}
                containerProps={{
                    style: { height: '82vh' },
                    className: cn(
                        "prose prose-sm max-w-none",
                        "dark:prose-invert"
                    )
                }}
                style={{ height: '100%', overflow: 'auto' }}
            />
        </div>
    );
} 