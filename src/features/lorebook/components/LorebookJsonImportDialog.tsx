import { useState } from "react";
import { toast } from "react-toastify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import parseLorebookJson from "@/features/brainstorm/utils/parseLorebookJson";
import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";
import {
  getDefaultSelectedLorebookImportIndexes,
  getLorebookImportWarnings,
  normalizeLorebookImportCategory,
  toLorebookEntryCreateInput,
} from "@/features/lorebook/utils/lorebookJsonImport";
import type { LorebookEntry } from "@/types/story";

interface LorebookJsonImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  existingEntries: LorebookEntry[];
  onImported?: () => Promise<void> | void;
}

export function LorebookJsonImportDialog({
  open,
  onOpenChange,
  storyId,
  existingEntries,
  onImported,
}: LorebookJsonImportDialogProps) {
  const createEntry = useLorebookStore((state) => state.createEntry);
  const [jsonText, setJsonText] = useState("");
  const [parsedEntries, setParsedEntries] = useState<Partial<LorebookEntry>[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const selectedCount = selectedIndexes.size;
  const allSelected = parsedEntries.length > 0 && selectedCount === parsedEntries.length;

  const reset = () => {
    setJsonText("");
    setParsedEntries([]);
    setSelectedIndexes(new Set());
    setParseError(null);
    setIsImporting(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) reset();
  };

  const handleTextChange = (value: string) => {
    setJsonText(value);
    setParsedEntries([]);
    setSelectedIndexes(new Set());
    setParseError(null);
  };

  const handlePreview = () => {
    const parsed = parseLorebookJson(jsonText);

    if (parsed.error) {
      setParseError(parsed.error);
      setParsedEntries([]);
      setSelectedIndexes(new Set());
      return;
    }

    if (parsed.entries.length === 0) {
      setParseError("No valid lorebook entries found.");
      setParsedEntries([]);
      setSelectedIndexes(new Set());
      return;
    }

    setParseError(null);
    setParsedEntries(parsed.entries);
    setSelectedIndexes(
      getDefaultSelectedLorebookImportIndexes(parsed.entries, existingEntries)
    );
  };

  const toggleEntry = (index: number, checked: boolean) => {
    setSelectedIndexes((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });
  };

  const setAllSelected = (checked: boolean) => {
    setSelectedIndexes(
      checked ? new Set(parsedEntries.map((_, index) => index)) : new Set()
    );
  };

  const handleImport = async () => {
    const entriesToImport = parsedEntries.filter((_, index) => selectedIndexes.has(index));

    if (entriesToImport.length === 0) {
      toast.info("Select at least one lorebook entry to import.");
      return;
    }

    try {
      setIsImporting(true);
      for (const entry of entriesToImport) {
        await createEntry(toLorebookEntryCreateInput(storyId, entry));
      }
      await onImported?.();
      toast.success(`Created ${entriesToImport.length} lorebook entr${entriesToImport.length === 1 ? "y" : "ies"}`);
      handleOpenChange(false);
    } catch (error) {
      console.error("Failed to import lorebook JSON", error);
      toast.error("Failed to create lorebook entries");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Import Lorebook JSON</DialogTitle>
          <DialogDescription>
            Paste lorebook JSON, preview the entries, then choose what to create.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={jsonText}
            onChange={(event) => handleTextChange(event.target.value)}
            placeholder={'Paste JSON like { "lorebookEntries": [ ... ] }'}
            className="min-h-[180px] font-mono text-xs"
          />
          {parseError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {parseError}
            </div>
          )}

          {parsedEntries.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 border-y py-2">
                <div className="text-sm text-muted-foreground">
                  {selectedCount} of {parsedEntries.length} selected
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAllSelected(!allSelected)}
                >
                  {allSelected ? "Clear all" : "Select all"}
                </Button>
              </div>

              <ScrollArea className="max-h-[34vh] pr-4">
                <div className="space-y-3 pb-1">
                  {parsedEntries.map((entry, index) => {
                    const checkboxId = `paste-lorebook-entry-${index}`;
                    const category = normalizeLorebookImportCategory(entry.category);
                    const warnings = getLorebookImportWarnings(entry, existingEntries);

                    return (
                      <div key={`${entry.name || "entry"}-${index}`} className="rounded-md border p-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={checkboxId}
                            checked={selectedIndexes.has(index)}
                            onCheckedChange={(checked) => toggleEntry(index, checked === true)}
                            className="mt-1"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <label htmlFor={checkboxId} className="cursor-pointer text-sm font-medium">
                                {entry.name || "Untitled entry"}
                              </label>
                              <Badge variant="secondary">{category}</Badge>
                              {entry.metadata?.importance && (
                                <Badge variant="outline">{entry.metadata.importance}</Badge>
                              )}
                            </div>
                            <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
                              {entry.description || "No description provided."}
                            </p>
                            {entry.aliases && entry.aliases.length > 0 && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">Aliases:</span>{" "}
                                {entry.aliases.join(", ")}
                              </div>
                            )}
                            {entry.tags && entry.tags.length > 0 && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">Tags:</span>{" "}
                                {entry.tags.join(", ")}
                              </div>
                            )}
                            {warnings.length > 0 && (
                              <div className="mt-2 space-y-1 text-xs text-amber-600 dark:text-amber-400">
                                {warnings.map((warning) => (
                                  <div key={warning}>{warning}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handlePreview}
            disabled={isImporting || !jsonText.trim()}
          >
            Preview
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={isImporting || selectedCount === 0}
          >
            {isImporting ? "Importing..." : `Import ${selectedCount}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
