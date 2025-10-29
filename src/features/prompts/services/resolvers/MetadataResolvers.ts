import { PromptContext } from '@/types/story';
import { IVariableResolver } from './types';

export class PoVResolver implements IVariableResolver {
    async resolve(context: PromptContext): Promise<string> {
        if (context.povType) {
            const povCharacter = context.povType !== 'Third Person Omniscient' && context.povCharacter
                ? ` (${context.povCharacter})`
                : '';
            return `${context.povType}${povCharacter}`;
        }

        if (context.currentChapter?.povType) {
            const povCharacter = context.currentChapter.povType !== 'Third Person Omniscient' && context.currentChapter.povCharacter
                ? ` (${context.currentChapter.povCharacter})`
                : '';
            return `${context.currentChapter.povType}${povCharacter}`;
        }

        return 'Third Person Omniscient';
    }
}

export class SelectedTextResolver implements IVariableResolver {
    async resolve(context: PromptContext): Promise<string> {
        if (!context.additionalContext?.selectedText) {
            return '';
        }

        return context.additionalContext.selectedText;
    }
}

export class StoryLanguageResolver implements IVariableResolver {
    async resolve(context: PromptContext): Promise<string> {
        return context.storyLanguage || 'English';
    }
}

export class SceneBeatResolver implements IVariableResolver {
    async resolve(context: PromptContext): Promise<string> {
        return context.scenebeat || '';
    }
}
