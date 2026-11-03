import { useEffect, useState } from 'react';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { PromptDraft } from '@/types/story';
import { usePromptDraftStore } from '../stores/usePromptDraftStore';

export function PromptDraftList({ storyId, onLoad }: { storyId: string; onLoad?: (draft: PromptDraft) => void }) {
    const { drafts, loading, error, fetchDrafts, renameDraft, deleteDraft } = usePromptDraftStore();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<PromptDraft | null>(null);
    useEffect(() => { void fetchDrafts(storyId); }, [storyId, fetchDrafts]);
    const visibleDrafts = drafts.filter(draft => draft.storyId === storyId);

    return <div className="space-y-3">
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {loading && <p role="status" className="text-sm text-muted-foreground">Loading prompt drafts...</p>}
        {!loading && !error && !visibleDrafts.length && <p className="py-6 text-center text-sm text-muted-foreground">No prompt drafts saved for this story yet.</p>}
        {visibleDrafts.map(draft => <article key={draft.id} aria-label={`Prompt draft: ${draft.name}`} className="min-w-0 space-y-3 rounded-lg border bg-card p-3">
            {editingId === draft.id ? <form className="flex gap-2" onSubmit={async event => {
                event.preventDefault();
                try { await renameDraft(draft.id, name); setEditingId(null); } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not rename prompt draft.'); }
            }}>
                <Input aria-label="Prompt draft name" value={name} onChange={event => setName(event.target.value)} autoFocus maxLength={160} />
                <Button size="sm" type="submit">Save name</Button>
                <Button size="sm" type="button" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
            </form> : <h3 className="break-words text-sm font-medium">{draft.name}</h3>}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{draft.source === 'scene_beat' ? 'SceneBeat' : 'Brainstorm'}</Badge>
                {draft.chapterTitle && <span className="break-words">{draft.chapterTitle}</span>}
                <span>{new Date(draft.updatedAt).toLocaleString()}</span>
            </div>
            <details>
                <summary className="cursor-pointer text-xs text-muted-foreground">View prompt text</summary>
                <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-muted/30 p-2 text-sm">{draft.content}</p>
            </details>
            <div className="flex flex-wrap gap-2">
                {onLoad && <Button size="sm" onClick={() => onLoad(draft)}>Load</Button>}
                <Button size="sm" variant="outline" onClick={async () => {
                    try { await navigator.clipboard.writeText(draft.content); toast.success('Prompt copied'); } catch { toast.error('Could not copy prompt.'); }
                }}><Copy className="mr-1 h-3 w-3" />Copy</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingId(draft.id); setName(draft.name); }}><Pencil className="mr-1 h-3 w-3" />Rename</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(draft)}><Trash2 className="mr-1 h-3 w-3" />Delete</Button>
            </div>
        </article>)}
        <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Delete prompt draft?</AlertDialogTitle><AlertDialogDescription>This removes the saved copy of "{deleteTarget?.name}". Your current input stays in place.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => {
                    try { await deleteDraft(deleteTarget!.id); setDeleteTarget(null); } catch { toast.error('Could not delete prompt draft.'); }
                }}>Delete draft</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>;
}
