import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Download, Upload, RotateCcw } from 'lucide-react';
import { toast } from 'react-toastify';
import useTemplateStore from '../store/templateStore';
import { Template } from '@/types/story';
import { DEFAULT_TEMPLATES } from '../defaultTemplates';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TemplateManagerDialog({ open, onOpenChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { exportTemplates, importTemplates, templates } = useTemplateStore();

  // --- Export ---
  const handleExport = async () => {
    try {
      const data = await exportTemplates();
      const exportPayload = data.map(({ id, createdAt, isSystem, ...rest }) => rest);
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `story-nexus-templates-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${data.length} template${data.length !== 1 ? 's' : ''}`);
    } catch (err) {
      console.error('Export failed', err);
      toast.error('Failed to export templates');
    }
  };

  // --- Import ---
  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      const text = await file.text();
      const parsed: Partial<Template>[] = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        toast.error('Invalid file — expected a JSON array of templates');
        return;
      }
      const { created, skipped } = await importTemplates(parsed);
      const parts = [];
      if (created > 0) parts.push(`${created} imported`);
      if (skipped > 0) parts.push(`${skipped} skipped (duplicate name or invalid)`);
      toast.success(parts.join(', ') || 'Nothing to import');
    } catch (err) {
      console.error('Import failed', err);
      toast.error('Failed to import — make sure the file is valid JSON');
    }
  };

  // --- Restore defaults ---
  const handleRestoreDefaults = async () => {
    try {
      const { created } = await importTemplates(DEFAULT_TEMPLATES);
      if (created > 0) {
        toast.success(`Restored ${created} default template${created !== 1 ? 's' : ''}`);
      } else {
        toast.info('All default templates are already present — nothing to restore');
      }
    } catch (err) {
      console.error('Restore defaults failed', err);
      toast.error('Failed to restore default templates');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Templates</DialogTitle>
          <DialogDescription>
            Export your templates to a JSON backup file, import from a previous backup, or restore
            the built-in default templates. Duplicates (same name) are skipped on import.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <div className="text-sm text-muted-foreground">
            You currently have{' '}
            <span className="font-medium text-foreground">{templates.length}</span>{' '}
            template{templates.length !== 1 ? 's' : ''} stored.
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1"
              variant="outline"
              onClick={handleExport}
              disabled={templates.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export to JSON
            </Button>

            <Button className="flex-1" variant="outline" onClick={handleImportClick}>
              <Upload className="h-4 w-4 mr-2" />
              Import from JSON
            </Button>
          </div>

          <Button variant="secondary" onClick={handleRestoreDefaults} className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" />
            Restore Default Templates
          </Button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
