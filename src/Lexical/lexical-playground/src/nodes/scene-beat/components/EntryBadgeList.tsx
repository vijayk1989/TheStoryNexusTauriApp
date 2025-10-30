import type { LorebookEntry } from "@/types/story";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface EntryBadgeListProps {
  entries: LorebookEntry[];
  onRemove?: (entryId: string) => void;
  emptyMessage?: string;
  showCategory?: boolean;
  className?: string;
}

/**
 * Displays a list of lorebook entries as badges, optionally with remove buttons.
 */
export const EntryBadgeList = ({
  entries,
  onRemove,
  emptyMessage = "No entries",
  showCategory = false,
  className = "",
}: EntryBadgeListProps): JSX.Element => {
  if (entries.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 max-h-[150px] overflow-y-auto ${className}`}>
      {entries.map((entry) => (
        <Badge
          key={entry.id}
          variant="secondary"
          className="flex items-center gap-1 px-3 py-1"
        >
          {entry.name}
          {showCategory && (
            <span className="text-xs text-muted-foreground ml-1 capitalize">
              ({entry.category})
            </span>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(entry.id)}
              className="ml-1 hover:text-destructive"
              aria-label={`Remove ${entry.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
    </div>
  );
};
