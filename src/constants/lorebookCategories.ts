export const LOREBOOK_CATEGORIES = {
  CHARACTER: 'character',
  LOCATION: 'location',
  ITEM: 'item',
  EVENT: 'event',
  NOTE: 'note',
  SYNOPSIS: 'synopsis',
  STARTING_SCENARIO: 'starting scenario',
  TIMELINE: 'timeline',
} as const;

export type LorebookCategory = typeof LOREBOOK_CATEGORIES[keyof typeof LOREBOOK_CATEGORIES];

export const LOREBOOK_CATEGORY_LIST = Object.values(LOREBOOK_CATEGORIES);
