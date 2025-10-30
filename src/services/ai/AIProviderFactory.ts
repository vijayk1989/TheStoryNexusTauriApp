import { AIProvider } from '@/types/story';
import { IAIProvider, LocalAIProvider, OpenAIProvider, OpenRouterProvider } from './providers';
import { API_URLS } from '@/constants/urls';

export class AIProviderFactory {
    private providers: Map<AIProvider, IAIProvider> = new Map();

    constructor(localApiUrl: string = API_URLS.LOCAL_AI_DEFAULT) {
        this.providers.set('local', new LocalAIProvider(localApiUrl));
        this.providers.set('openai', new OpenAIProvider());
        this.providers.set('openrouter', new OpenRouterProvider());
    }

    getProvider(provider: AIProvider): IAIProvider {
        const p = this.providers.get(provider);
        if (!p) {
            throw new Error(`Provider ${provider} not found`);
        }
        return p;
    }

    initializeProvider(provider: AIProvider, config?: string): void {
        const p = this.getProvider(provider);
        p.initialize(config);
    }

    updateLocalApiUrl(url: string): void {
        const localProvider = this.providers.get('local') as LocalAIProvider;
        localProvider.initialize(url);
    }
}
