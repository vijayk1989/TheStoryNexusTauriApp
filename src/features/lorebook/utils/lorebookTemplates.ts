import type { LorebookEntry } from '@/types/story';

type LorebookCategory = LorebookEntry['category'];

/**
 * Category-specific template guidance injected into the AI user message.
 * Each string lists the aspects an AI should cover when creating/refining
 * an entry of that category.
 */
export const LOREBOOK_TEMPLATES: Record<LorebookCategory, string> = {
    character: `Please cover the following aspects in the description:
- Full name and any aliases or nicknames
- Physical appearance (approximate age, build, distinguishing features, typical attire)
- Personality traits and demeanor
- Backstory and formative life events
- Goals, motivations, and desires
- Fears, weaknesses, and flaws
- Key relationships with other characters
- Role and function in the story
- Speech patterns or linguistic quirks (if notable)`,

    location: `Please cover the following aspects in the description:
- Physical appearance and sensory atmosphere (sights, sounds, smells)
- Geographic context and position in the world
- History of how the location came to exist or evolved
- Cultural, political, or social significance
- Who inhabits or frequents this place
- Notable landmarks, features, or secrets
- Dangers, hazards, or restricted areas (if any)`,

    item: `Please cover the following aspects in the description:
- Physical appearance (size, material, colour, markings)
- Origin and history — how it was created or came to be
- Powers, properties, or special abilities (if any)
- Current owner and how they acquired it
- Past owners or history of possession
- Narrative significance to the story`,

    event: `Please cover the following aspects in the description:
- What happened and when (in story time)
- Who was involved and their respective roles
- The causes or triggers that led to this event
- Immediate consequences and aftermath
- Long-term impact on the world or characters
- How different characters perceive or remember the event`,

    note: `Please cover the following aspects in the description:
- The core topic or subject matter
- Key facts or details to remember
- Why this information is significant to the story
- Any connections to characters, locations, or events`,

    synopsis: `Please cover the following aspects in the description:
- The overall story premise and central question
- The main conflict driving the narrative
- The protagonist's primary goal
- The tone and genre of the story
- The setting (time period, world type)
- The core themes or ideas being explored`,

    'starting scenario': `Please cover the following aspects in the description:
- The opening situation when the story begins
- The inciting incident that sets events in motion
- Where the main characters are positioned at the start
- The immediate stakes and what is at risk
- What the reader/player needs to know to engage`,

    timeline: `Please cover the following aspects in the description:
- The overall time period or span covered
- Key dates, milestones, or turning points
- The order of major events and how they connect
- Cause-and-effect chains between events
- Any gaps, mysteries, or disputed periods in the timeline`,
};
