/**
 * Built-in system templates that ship with the app.
 * These are NOT seeded automatically into the DB at startup —
 * they're restored on demand via the Template Manager.
 */

export interface DefaultTemplate {
  name: string;
  content: string;
  templateType: 'chat' | 'other';
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    name: 'Lorebook Entry (JSON)',
    templateType: 'chat',
    content: `Please produce exactly one JSON object (or an array of objects) inside a \`\`\`json\ncode block only. Do NOT include any surrounding explanation or commentary. Each object should include at least a "name" field (string). Optional fields: "description" (string), "aliases" (array of lookup names and phrases), "tags" (array of descriptive labels), "category" (one of ["character","location","item","event","note","synopsis","starting scenario","timeline"]), "metadata" (object), and "isDisabled" (boolean).\n\nExample:\n{\n  "name": "Elandra, Crowned Hunter",\n  "description": "A skilled tracker and ruler of the northern woodlands.",\n  "aliases": ["Elandra", "Crowned Hunter"],\n  "tags": ["ranger", "royalty"],\n  "category": "character",\n  "metadata": { "importance": "major", "status": "active" }\n}\n\nAliases are lookup names or phrases used to match this entry in prose. Tags are descriptive labels for organization.\n\nReturn only the JSON inside the fenced code block.`,
  },
];
