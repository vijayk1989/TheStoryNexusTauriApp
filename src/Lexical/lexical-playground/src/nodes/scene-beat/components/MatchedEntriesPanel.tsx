import type { LorebookEntry } from "@/types/story";
import { EntryBadgeList } from "./EntryBadgeList";

interface MatchedEntriesPanelProps {
  chapterMatchedEntries: Map<string, LorebookEntry>;
  sceneBeatMatchedEntries: Map<string, LorebookEntry>;
  customContextEntries: LorebookEntry[];
  useMatchedChapter: boolean;
  useMatchedSceneBeat: boolean;
  useCustomContext: boolean;
}

/**
 * Display panel showing all matched entries sections (chapter, scene beat, custom).
 * Shows "(Included)" indicator for enabled sections.
 */
export const MatchedEntriesPanel = ({
  chapterMatchedEntries,
  sceneBeatMatchedEntries,
  customContextEntries,
  useMatchedChapter,
  useMatchedSceneBeat,
  useCustomContext,
}: MatchedEntriesPanelProps): JSX.Element => {
  return (
    <div className="p-4 border-t">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Matched Entries</h3>
        <div className="text-xs text-muted-foreground">
          Entries that match tags in your content
        </div>
      </div>

      <div className="space-y-4">
        {/* Chapter Matched Entries */}
        <div>
          <div className="text-sm font-medium mb-2">
            Chapter Matched Entries{" "}
            {useMatchedChapter && (
              <span className="text-xs text-green-500">(Included)</span>
            )}
          </div>
          <div className="mb-4 border rounded-md p-3 bg-muted/10">
            <EntryBadgeList
              entries={Array.from(chapterMatchedEntries.values())}
              showCategory
              emptyMessage="No matched entries found"
            />
          </div>
        </div>

        {/* Scene Beat Matched Entries */}
        <div>
          <div className="text-sm font-medium mb-2">
            Scene Beat Matched Entries{" "}
            {useMatchedSceneBeat && (
              <span className="text-xs text-green-500">(Included)</span>
            )}
          </div>
          <div className="mb-4 border rounded-md p-3 bg-muted/10">
            <EntryBadgeList
              entries={Array.from(sceneBeatMatchedEntries.values())}
              showCategory
              emptyMessage="No matched entries found"
            />
          </div>
        </div>

        {/* Custom Context Entries */}
        {useCustomContext && (
          <div>
            <div className="text-sm font-medium mb-2">
              Custom Context Entries{" "}
              <span className="text-xs text-green-500">(Included)</span>
            </div>
            <div className="mb-4 border rounded-md p-3 bg-muted/10">
              <EntryBadgeList
                entries={customContextEntries}
                showCategory
                emptyMessage="No items selected"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
