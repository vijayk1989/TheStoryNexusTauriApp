import { useEffect, useState } from 'react';
import { X, ImageOff } from 'lucide-react';
import { assetRepository } from '@/features/images/services/assetStorage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function ChatImageAttachments({ ids, onRemove }: { ids: string[]; onRemove?: (id: string) => void }) {
    const [images, setImages] = useState<Array<{ id: string; url?: string }>>([]);
    const [expanded, setExpanded] = useState<string>();
    const key = JSON.stringify(ids);
    useEffect(() => {
        let active = true;
        Promise.all(ids.map(async id => ({ id, url: await assetRepository.getDisplayUrl(id).catch(() => undefined) })))
            .then(result => { if (active) setImages(result); });
        return () => { active = false; };
    }, [key]);
    if (!ids.length) return null;
    return (
        <div className="flex flex-wrap gap-2 py-2" role="group" aria-label="Image attachments">
            {images.map((image, index) => (
                <div key={image.id} className="relative h-20 w-20 overflow-hidden rounded-md border bg-background">
                    {image.url ? <button type="button" className="h-full w-full" aria-label={`View attached image ${index + 1}`} onClick={() => setExpanded(image.url)}>
                        <img src={image.url} alt={`Attached image ${index + 1}`} className="h-full w-full object-contain" />
                    </button> : <span className="flex h-full items-center justify-center" title="Image unavailable"><ImageOff className="h-6 w-6" /></span>}
                    {onRemove && <button type="button" className="absolute right-0 top-0 rounded-bl bg-background p-1 text-foreground" aria-label={`Remove attached image ${index + 1}`} onClick={() => onRemove(image.id)}><X className="h-4 w-4" /></button>}
                </div>
            ))}
            <Dialog open={!!expanded} onOpenChange={open => { if (!open) setExpanded(undefined); }}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader><DialogTitle>Attached image</DialogTitle></DialogHeader>
                    {expanded && <img src={expanded} alt="Attached image" className="max-h-[75vh] w-full object-contain" />}
                </DialogContent>
            </Dialog>
        </div>
    );
}
