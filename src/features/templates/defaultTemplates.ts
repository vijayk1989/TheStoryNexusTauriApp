/**
 * Built-in system templates that ship with the app.
 * These are NOT seeded automatically into the DB at startup —
 * they're restored on demand via the Template Manager.
 */

import { LOREBOOK_CATEGORIES } from "@/types/story";

export interface DefaultTemplate {
  name: string;
  content: string;
  templateType: 'chat' | 'other';
}

export interface SystemTemplate extends DefaultTemplate {
  id: string;
}

export const SYSTEM_TEMPLATES: SystemTemplate[] = [
  {
    id: 'system-image-prompt-anima-natural-language',
    name: 'Image Prompt — Anima (Natural Language)',
    templateType: 'chat',
    content: `Create one production-ready image-generation prompt from the chapter data included in the current Brainstorm context.

Target model: Anima
Prompt format: natural language

Identify the single strongest visual moment in the chapter. Describe only details supported by the chapter: the subjects and their distinctive appearance, clothing, pose and expression; the setting and important props; the action; composition and camera framing; lighting, color palette, atmosphere, and visual style. Preserve story continuity and do not invent conflicting character or setting details.

Write a vivid, coherent natural-language prompt rather than a list of tags. Anima also understands tag-like quality cues, so begin with: masterpiece, best quality, score_7, safe. Do not include a negative prompt, generation settings, explanations, headings, alternatives, or quotation marks. Return only the final prompt, ready to paste into the image generator.`,
  },
];

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    name: 'Lorebook Entry (JSON)',
    templateType: 'chat',
    content: `Please produce exactly one JSON object (or an array of objects) inside a \`\`\`json\ncode block only. Do NOT include any surrounding explanation or commentary. Each object should include at least a "name" field (string). Optional fields: "description" (string), "aliases" (array of lookup names and phrases), "tags" (array of descriptive labels), "category" (one of ${JSON.stringify(LOREBOOK_CATEGORIES)}), "metadata" (object), and "isDisabled" (boolean).\n\nExample:\n{\n  "name": "Elandra, Crowned Hunter",\n  "description": "A skilled tracker and ruler of the northern woodlands.",\n  "aliases": ["Elandra", "Crowned Hunter"],\n  "tags": ["ranger", "royalty"],\n  "category": "character",\n  "metadata": { "importance": "major", "status": "active" }\n}\n\nUse "magic system" for rules, costs, limits, schools, or sources of magic. Use "world rule" for durable setting constraints, social rules, laws, taboos, canon assumptions, or AU divergence rules.\nAliases are lookup names or phrases used to match this entry in prose. Tags are descriptive labels for organization.\n\nReturn only the JSON inside the fenced code block.`,
  },
  {
    name: 'World Seed Builder',
    templateType: 'chat',
    content: `Build a starter world seed from this premise and return importable lorebook JSON.\n\nPremise / fandom / source inspiration:\nAU or original divergence point:\nMain characters:\nKey relationships or tensions:\nTone and genre:\nCanon strictness or continuity rules:\nOpening situation:\nWhat to avoid:\n\nCreate a balanced starter set, not an exhaustive encyclopedia. Include exactly one synopsis entry, 1-3 starting scenario entries, requested major characters, and only the locations/events/items needed to start writing. Use "magic system" for supernatural mechanics and "world rule" for durable setting constraints, canon assumptions, AU divergence rules, laws, taboos, or social rules.\n\nReturn only JSON inside one fenced \`\`\`json code block using this shape:\n{\n  "lorebookEntries": [\n    {\n      "name": "Entry name",\n      "description": "Durable fact useful for future writing continuity.",\n      "aliases": ["precise lookup phrase"],\n      "tags": ["descriptive label"],\n      "category": "synopsis",\n      "metadata": { "importance": "major", "status": "active", "type": "world_seed" },\n      "isDisabled": false\n    }\n  ]\n}\n\nAllowed categories: ${LOREBOOK_CATEGORIES.map((category) => `"${category}"`).join(", ")}.`,
  },
];
