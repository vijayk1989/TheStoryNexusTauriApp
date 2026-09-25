import { useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import type { LorebookEntry } from '@/types/story';
import { useLorebookStore } from '../stores/useLorebookStore';
import { lorebookToMarkdown } from '../utils/lorebookMarkdown';

export function CopyLorebookMarkdownButton({ entries, compact = false }: {
    entries: LorebookEntry[];
    compact?: boolean;
}) {
    const relatedEntries = useLorebookStore(state => state.entries);
    const [copying, setCopying] = useState(false);
    const label = compact ? `Copy ${entries[0]?.name || 'entry'} as Markdown` : 'Copy all as Markdown';

    return (
        <Button
            type="button"
            variant={compact ? 'ghost' : 'outline'}
            size={compact ? 'icon' : 'sm'}
            className={compact ? 'h-6 w-6 shrink-0' : undefined}
            title={label}
            aria-label={label}
            disabled={copying || entries.length === 0}
            onClick={async event => {
                event.stopPropagation();
                setCopying(true);
                try {
                    await navigator.clipboard.writeText(lorebookToMarkdown(entries, relatedEntries));
                    toast.success('Copied as Markdown');
                } catch {
                    toast.error('Could not copy to clipboard. Please try again.');
                } finally {
                    setCopying(false);
                }
            }}
        >
            <Copy className={compact ? 'h-3 w-3' : 'h-4 w-4 mr-2'} />
            {!compact && 'Copy all as MD'}
        </Button>
    );
}
