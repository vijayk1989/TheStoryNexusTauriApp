import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useTemplateStore } from '../store/templateStore';
import { Template } from '@/types/story';
import { toast } from 'react-toastify';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: Template | null; // if provided, we are editing
}

export default function CreateTemplateDialog({ open, onOpenChange, template }: Props) {
  const [name, setName] = useState(template?.name || '');
  const [content, setContent] = useState(template?.content || '');
  const { createTemplate, updateTemplate } = useTemplateStore();
  const { deleteTemplate } = useTemplateStore();

  useEffect(() => {
    setName(template?.name || '');
    setContent(template?.content || '');
  }, [template]);

  const handleSave = async () => {
    try {
      if (!name.trim() || !content.trim()) {
        toast.error('Name and content are required');
        return;
      }

      if (template) {
        await updateTemplate(template.id, { name: name.trim(), content: content.trim() });
        toast.success('Template updated');
      } else {
        await createTemplate({ name: name.trim(), content: content.trim(), templateType: 'chat' });
        toast.success('Template created');
      }

      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save template', err);
      toast.error('Failed to save template');
    }
  };

  const handleDelete = async () => {
    if (!template) return;
    if (!confirm(`Delete template "${template.name}"? This cannot be undone.`)) return;

    try {
      await deleteTemplate(template.id);
      toast.success('Template deleted');
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to delete template', err);
      toast.error('Failed to delete template');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{template ? 'Edit Template' : 'Create Template'}</DialogTitle>
          <DialogDescription>
            Templates are quick insert helpers available in the chat Insert... dropdown.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />

          <label className="text-sm font-medium">Template Content</label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[120px]" />
        </div>

        <DialogFooter className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          {template && (
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          )}
          <Button onClick={handleSave}>{template ? 'Save' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
