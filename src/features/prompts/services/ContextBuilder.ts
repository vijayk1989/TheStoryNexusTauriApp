import { StoryDatabase } from '@/services/database';
import { PromptParserConfig, PromptContext } from '@/types/story';

export class ContextBuilder {
    constructor(private database: StoryDatabase) {}

    async buildContext(config: PromptParserConfig): Promise<PromptContext> {
        const [chapters, currentChapter] = await Promise.all([
            this.database.chapters.where('storyId').equals(config.storyId).toArray(),
            config.chapterId ? this.database.chapters.get(config.chapterId) : undefined
        ]);

        return {
            ...config,
            chapters,
            currentChapter,
            matchedEntries: config.matchedEntries,
            povCharacter: config.povCharacter || currentChapter?.povCharacter,
            povType: config.povType || currentChapter?.povType || 'Third Person Omniscient',
            additionalContext: config.additionalContext || {}
        };
    }
}
