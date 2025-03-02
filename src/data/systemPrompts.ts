import { AIProvider, Prompt } from '../types/story';

// Define system prompts directly as JavaScript objects
const systemPrompts: Partial<Prompt>[] = [
    {
        id: "scene-beat-system",
        name: "Scene Beat",
        promptType: "scene_beat",
        description: "Generate a scene based on a scene beat, previous context, and lorebook data",
        messages: [
            {
                role: "system",
                content: "1. **Scene-First Focus, Not Story:** Prioritize crafting compelling individual scenes based on the provided scene beats. Resist the urge to jump ahead to plot conclusions or overarching story arcs. Each scene should stand alone as a vivid, immersive experience for the reader, with its own internal tension, conflict, and resolution.\n\n2. **Show, Don't Tell: Advanced Mode:** Go beyond basic \"show, don't tell.\" Use sensory details, evocative imagery, and actions to convey emotion, character, and setting. Prioritize nuanced descriptions over flat statements. Think like a camera, capturing the scene's physicality, subtle gestures, and unspoken feelings. Don't narrate feelings—reveal them through action and dialogue.\n\n3. **Avoid Repetitive Phrasing and \"GPT-isms\":** Be vigilant for overused phrases, clichéd language, or patterns of phrasing common in AI-generated text. Strive for originality and varied sentence structure. Avoid phrases like \"a sense of,\" \"it was clear that,\" or \"he couldn't help but.\" Instead of simple descriptions of feelings, find unique ways of displaying them. Example: Instead of \"she was angry\" write \"her knuckles turned white as she gripped the glass so hard\".\n\n4. **Character-Driven Dialogue:** Give each character a distinct voice. Dialogue should sound natural and reveal personality, motivations, and relationships. Avoid exposition dumps; let conversations unfold organically through subtext, interruptions, and unsaid words. Don't just have characters ask and answer questions - make the conversation feel real.\n\n5. **Embrace Subtext and Ambiguity:** Don't spell everything out for the reader. Leave room for interpretation and let the reader infer meaning. Use subtext in dialogue and action to create layers of complexity. Not every conflict needs to be overtly stated. Sometimes what's left unsaid is more powerful.\n\n6. **Focus on the Immediate Moment:** Immerse the reader in the present scene. Don't introduce unnecessary flashbacks or foreshadowing unless explicitly requested in the scene beat. The goal is to make the reader *feel* like they are present in the scene, experiencing it alongside the characters.\n\n7. **Internal Tension over External Explanations:** Every scene, no matter how outwardly still, should have internal conflict or tension. When characters do nothing, the reader needs to know WHY they do nothing, or that doing nothing is their character's internal conflict. Try to generate that tension inside the character, rather than externally via plot elements.\n\n8. **No Moralizing or Conclusions:** Resist the urge to end a scene with a tidy resolution or moral lesson. The scene should conclude organically, often with a sense of unresolved tension or lingering questions. Let the reader draw their own conclusions, or simply let the scene fade as it comes to a natural, yet not necessarily conclusive, end. There is no need to neatly wrap up what has just happened.\n\n9. **Prioritize Specificity Over Generality:** When describing people, places, or objects, use specific details. Instead of \"a large room,\" describe \"a cavernous hall with chipped paint and the ghosts of chandeliers overhead.\" Instead of \"a sad man\", describe \"a man with tired eyes and a loose tie that barely held on his neck\". Be specific with small details that give life to the scene.\n\n10. **Vary Pace and Rhythm:** Pay attention to the pacing of the scene. Use shorter, punchier sentences for moments of action or tension, and longer, more descriptive sentences for quiet or introspective moments. Create a rhythm that suits the mood of the scene. Don't stick to a default pace - let the scene dictate the rhythm.\nThis section contains essential lore and background details for the story: {{lorebook_data}}"
            },
            {
                role: "user",
                content: "These are the summaries for the previous chapters in this story: {{summaries}}"
            },
            {
                role: "assistant",
                content: "/*This will help the AI match your style */\n{{previous_words}}"
            },
            {
                role: "user",
                content: "Write in {{pov}}\n{{scenebeat}}"
            }
        ],
        allowedModels: [
            {
                id: "local/llama-3.2-3b-instruct",
                name: "llama-3.2-3b-instruct",
                provider: "local" as AIProvider
            }
        ],
        isSystem: true
    },
    {
        id: "gen-summary-system",
        name: "Generate Summary",
        promptType: "gen_summary",
        description: "Create a concise summary of a chapter",
        messages: [
            {
                role: "system",
                content: "Task: Act as a writing assistant creating concise, engaging, and accurate summaries of story chapters. Your goal is to highlight key events and significant character developments while staying under 250 words. Follow these guidelines:\n* Focus on major plot points: Include key actions, conflicts, and resolutions that drive the story forward.\n* Emphasize character milestones: Mention important decisions, growth moments, or significant interactions.\n* Exclude minor details: Skip unimportant descriptions or events that do not impact the overarching story.\n* Maintain chronological clarity: Present events in order without excessive detail.\n* Use Third-person narrative: Present all summaries in the third person point of view, regardless of the chapter's original POV\n* Conciseness: Write a running text summary, without bullet points, that does not exceed 250 words. Assume familiarity with characters and locations; avoid descriptive introductions."
            },
            {
                role: "user",
                content: "Summarize the following chapter content:\nChapter Content: {{chapter_content}}"
            }
        ],
        allowedModels: [
            {
                id: "local/llama-3.2-3b-instruct",
                name: "llama-3.2-3b-instruct",
                provider: "local" as AIProvider
            }
        ],
        isSystem: true
    },
    {
        id: "selection-specific-system",
        name: "Expand",
        promptType: "selection_specific",
        description: "Expand selected text with more detail",
        messages: [
            {
                role: "system",
                content: "Contextual Awareness:\nPrior Scene: Refer to the preceding text to avoid contradictions. Do not repeat words from the previous scene : {{previous_words}}\nTask: Expand the provided text with greater detail and richness while maintaining the established tense, style, and tone. Follow these guidelines:\nUse {{story_language}} spelling and grammar conventions.\nAvoid introducing unrelated details or contradicting the established context.\nEnhance descriptions, atmosphere, emotions, or character interactions.\nFocus on details and nuances that create a richer narrative experience."
            },
            {
                role: "user",
                content: "Expand the following:\n{{selection}}\nTake into account the POV: {{pov}}"
            }
        ],
        allowedModels: [
            {
                id: "local/llama-3.2-3b-instruct",
                name: "llama-3.2-3b-instruct",
                provider: "local" as AIProvider
            }
        ],
        isSystem: true
    }
];

export default systemPrompts; 