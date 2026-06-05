import type { PovType } from "@/types/story";

export type PovOption = {
  value: PovType;
  label: string;
  description: string;
  usesCharacter: boolean;
};

export const POV_OPTIONS: PovOption[] = [
  {
    value: "First Person",
    label: "First Person",
    description: 'Narrated as "I" or "we" from inside one narrator\'s experience.',
    usesCharacter: true,
  },
  {
    value: "Second Person",
    label: "Second Person",
    description: 'Addresses the viewpoint character as "you" for immediacy or intimacy.',
    usesCharacter: true,
  },
  {
    value: "Third Person",
    label: "Third Person",
    description: 'Narrated with "he", "she", or "they" without locking into a stricter mode.',
    usesCharacter: false,
  },
  {
    value: "Third Person Limited",
    label: "Third Person Limited",
    description: "Third-person narration limited to one character's perceptions and thoughts.",
    usesCharacter: true,
  },
  {
    value: "Third Person Omniscient",
    label: "Third Person Omniscient",
    description: "An all-knowing narrator can move between minds, places, and story context.",
    usesCharacter: false,
  },
  {
    value: "Third Person (Objective)",
    label: "Third Person (Objective)",
    description: "Camera-like third person that reports observable action without inner thoughts.",
    usesCharacter: false,
  },
];

export function povUsesCharacter(povType?: PovType): boolean {
  return POV_OPTIONS.some((option) => option.value === povType && option.usesCharacter);
}

export function getPovShortLabel(povType?: PovType): string {
  switch (povType) {
    case "Third Person Omniscient":
      return "Omni";
    case "Third Person (Objective)":
      return "Objective";
    case "Third Person Limited":
      return "Limited";
    case "Second Person":
      return "Second";
    case "First Person":
      return "First";
    case "Third Person":
      return "Third";
    default:
      return "Select";
  }
}
