import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLorebookStore } from "../stores/useLorebookStore";
import { toast } from "react-toastify";
import type { LorebookEntry } from "@/types/story";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { attemptPromise } from '@jfdi/attempt';

interface CreateEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  entry?: LorebookEntry;
}

// Use the category type directly from the LorebookEntry interface
type LorebookCategory = LorebookEntry["category"];
const CATEGORIES: LorebookCategory[] = [
  "character",
  "location",
  "item",
  "event",
  "note",
  "synopsis",
  "starting scenario",
  "timeline",
];
const IMPORTANCE_LEVELS = ["major", "minor", "background"] as const;
const STATUS_OPTIONS = ["active", "inactive", "historical"] as const;

type ImportanceLevel = (typeof IMPORTANCE_LEVELS)[number];
type StatusOption = (typeof STATUS_OPTIONS)[number];

export function CreateEntryDialog({
  open,
  onOpenChange,
  storyId,
  entry,
}: CreateEntryDialogProps) {
  const { createEntry, updateEntryAndRebuildTags } = useLorebookStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Initial form state in a separate constant for reuse
  const initialFormState = {
    name: "",
    description: "",
    category: "character" as const,
    tags: [],
    isDisabled: false,
    metadata: {
      importance: "minor" as const,
      status: "active" as const,
      type: "",
      relationships: [],
      customFields: {},
    },
  };

  const [formData, setFormData] = useState<Partial<LorebookEntry>>(
    entry
      ? {
          name: entry.name,
          description: entry.description,
          category: entry.category,
          tags: entry.tags,
          isDisabled: entry.isDisabled,
          metadata: entry.metadata,
        }
      : initialFormState
  );

  const [tagInput, setTagInput] = useState(entry?.tags?.join(", ") ?? "");

  const resetForm = () => {
    setFormData(initialFormState);
    setTagInput("");
    setAdvancedOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSubmitting(true);

    const [error] = await attemptPromise(async () => {
      const processedTags = tagInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const dataToSubmit = {
        ...formData,
        tags: processedTags,
      };

      if (entry) {
        await updateEntryAndRebuildTags(entry.id, dataToSubmit);
        toast.success("Entry updated successfully");
      } else {
        await createEntry({
          ...dataToSubmit,
          storyId,
        } as Omit<LorebookEntry, "id" | "createdAt">);
        toast.success("Entry created successfully");
        resetForm();
      }
      onOpenChange(false);
    });
    if (error) {
      toast.error(entry ? "Failed to update entry" : "Failed to create entry");
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit Entry" : "Create New Entry"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value: LorebookEntry["category"]) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="importance">Importance</Label>
              <Select
                value={formData.metadata?.importance}
                onValueChange={(value: ImportanceLevel) =>
                  setFormData((prev) => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata,
                      importance: value,
                    },
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select importance" />
                </SelectTrigger>
                <SelectContent>
                  {IMPORTANCE_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="space-y-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Harry Potter, The Boy Who Lived, Quidditch Player"
              />
              <p className="text-sm text-muted-foreground">
                Enter tags separated by commas. The entry name is automatically
                used as a tag. You can use spaces and special characters in
                tags.
              </p>
            </div>
          </div>

          {/* Show current tags preview */}
          {tagInput && (
            <div className="flex flex-wrap gap-2">
              {tagInput.split(",").map(
                (tag) =>
                  tag.trim() && (
                    <Badge key={tag.trim()} variant="secondary" className="group">
                      {tag.trim()}
                    </Badge>
                  )
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={6}
              required
            />
          </div>

          {/* Advanced Section */}
          <Collapsible
            open={advancedOpen}
            onOpenChange={setAdvancedOpen}
            className="border rounded-md p-2"
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="flex w-full justify-between p-2"
                type="button"
              >
                <span className="font-semibold">Advanced Settings</span>
                {advancedOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Input
                    id="type"
                    value={formData.metadata?.type || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        metadata: {
                          ...prev.metadata,
                          type: e.target.value,
                        },
                      }))
                    }
                    placeholder="E.g., Protagonist, Villain, Capital City"
                  />
                  <p className="text-xs text-muted-foreground">
                    Specific type within the category (e.g., Protagonist,
                    Villain, Capital City)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.metadata?.status || "active"}
                    onValueChange={(value: StatusOption) =>
                      setFormData((prev) => ({
                        ...prev,
                        metadata: {
                          ...prev.metadata,
                          status: value,
                        },
                      }))
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Custom Fields</Label>
                <div className="border rounded-md p-3 bg-muted/20">
                  <p className="text-sm text-muted-foreground mb-2">
                    Custom fields will be added in a future update. These will
                    allow you to add any additional information specific to your
                    lorebook entries.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="disabled"
                  checked={formData.isDisabled || false}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      isDisabled: checked,
                    }))
                  }
                />
                <Label htmlFor="disabled">Disable this entry</Label>
                <p className="text-xs text-muted-foreground ml-2">
                  Disabled entries won't be matched in text or included in AI
                  context
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : entry ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
