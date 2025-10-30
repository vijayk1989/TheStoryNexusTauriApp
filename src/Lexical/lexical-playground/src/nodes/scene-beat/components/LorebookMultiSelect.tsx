import type { LorebookEntry } from "@/types/story";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntryBadgeList } from "./EntryBadgeList";

interface LorebookMultiSelectProps {
  entries: LorebookEntry[];
  selectedItems: LorebookEntry[];
  onItemSelect: (entryId: string) => void;
  onItemRemove: (entryId: string) => void;
  categories?: string[];
  label?: string;
  placeholder?: string;
}

/**
 * Multi-select dropdown for lorebook entries grouped by category.
 * Displays selected items as removable badges below the dropdown.
 */
export const LorebookMultiSelect = ({
  entries,
  selectedItems,
  onItemSelect,
  onItemRemove,
  categories = ["character", "location", "item", "event", "note"],
  label = "Lorebook Items",
  placeholder = "Select lorebook item",
}: LorebookMultiSelectProps): JSX.Element => {
  const handleValueChange = (value: string) => {
    onItemSelect(value);
    // Reset the select value after selection
    const selectElement = document.querySelector('[data-lorebook-select="true"]');
    if (selectElement) {
      (selectElement as HTMLSelectElement).value = "";
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex-1">
          <div className="text-sm font-medium mb-1">{label}</div>
          <Select onValueChange={handleValueChange} value="">
            <SelectTrigger className="w-full" data-lorebook-select="true">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {categories.map((category) => {
                const categoryItems = entries.filter(
                  (entry) => entry.category === category
                );
                if (categoryItems.length === 0) return null;

                return (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted capitalize">
                      {category}s
                    </div>
                    {categoryItems.map((entry) => (
                      <SelectItem
                        key={entry.id}
                        value={entry.id}
                        disabled={selectedItems.some((item) => item.id === entry.id)}
                      >
                        {entry.name}
                      </SelectItem>
                    ))}
                  </div>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Badges section */}
      <div className="border rounded-md p-3 bg-muted/10">
        <div className="text-sm font-medium mb-2">Selected Items</div>
        <EntryBadgeList
          entries={selectedItems}
          onRemove={onItemRemove}
          emptyMessage="No items selected"
        />
      </div>
    </div>
  );
};
