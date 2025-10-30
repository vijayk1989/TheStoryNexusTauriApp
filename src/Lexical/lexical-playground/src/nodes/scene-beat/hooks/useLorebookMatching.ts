import { useMemo } from "react";
import type { LorebookEntry } from "@/types/story";

/**
 * Custom hook to compute lorebook entries matched from command text.
 * Replaces useEffect antipattern with proper derived state using useMemo.
 *
 * @param command - The scene beat command text
 * @param tagMap - Map of tags to lorebook entries
 * @returns Map of matched lorebook entries
 */
export const useLorebookMatching = (
  command: string,
  tagMap: Record<string, LorebookEntry>
): Map<string, LorebookEntry> => {
  return useMemo(() => {
    const matchedEntries = new Map<string, LorebookEntry>();
    const lowerCommand = command.toLowerCase();

    Object.entries(tagMap).forEach(([tag, entry]) => {
      if (lowerCommand.includes(tag.toLowerCase())) {
        matchedEntries.set(entry.id, entry);
      }
    });

    return matchedEntries;
  }, [command, tagMap]);
};
