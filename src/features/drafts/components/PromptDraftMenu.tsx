import { useState } from 'react';
import { FolderOpen, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { flushBrainstormInputs } from '@/features/brainstorm/services/brainstormInputPersistence';
import type { PromptDraft } from '@/types/story';
import { usePromptDraftStore, type PromptDraftInput } from '../stores/usePromptDraftStore';
import { PromptDraftList } from './PromptDraftList';

export function PromptDraftMenu({ snapshot, onLoad, disabled }: {
    snapshot: PromptDraftInput;
    onLoad: (draft: PromptDraft, mode: 'replace' | 'append') => void | Promise<void>;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pending, setPending] = useState<PromptDraft | null>(null);
    const load = async (draft: PromptDraft, mode: 'replace' | 'append') => {
        try { await onLoad(draft, mode); setPending(null); setOpen(false); } catch { toast.error('Could not load prompt draft.'); }
    };
    return <>
        <DropdownMenu>
            <DropdownMenuTrigger asChild><Button type="button" variant="outline" size="sm" className="h-10" disabled={disabled || saving}><FolderOpen className="mr-1 h-4 w-4" />{saving ? 'Saving...' : 'Prompt drafts'}</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                <DropdownMenuItem disabled={!snapshot.content.trim()} onSelect={async () => {
                    setSaving(true);
                    try {
                        await flushBrainstormInputs();
                        await usePromptDraftStore.getState().saveDraft(snapshot);
                        toast.success('Prompt draft saved');
                    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save prompt draft.'); }
                    finally { setSaving(false); }
                }}><Save className="mr-2 h-4 w-4" />Save prompt draft</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setOpen(true)}><FolderOpen className="mr-2 h-4 w-4" />Load prompt draft</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl" onPointerDownCapture={event => event.stopPropagation()} onPointerUpCapture={event => event.stopPropagation()}>
                <DialogHeader><DialogTitle>Load prompt draft</DialogTitle></DialogHeader>
                {open && <PromptDraftList storyId={snapshot.storyId} onLoad={draft => {
                    if (snapshot.content.trim()) setPending(draft);
                    else void load(draft, 'replace');
                }} />}
            </DialogContent>
        </Dialog>
        <AlertDialog open={!!pending} onOpenChange={open => !open && setPending(null)}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Use this prompt draft?</AlertDialogTitle><AlertDialogDescription>Your input already contains text. Choose how to load "{pending?.name}".</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter className="flex-wrap gap-2">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <Button variant="outline" onClick={() => void load(pending!, 'append')}>Append to input</Button>
                    <Button onClick={() => void load(pending!, 'replace')}>Replace input</Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>;
}
