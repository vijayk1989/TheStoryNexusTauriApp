import { PromptContext, LorebookEntry } from '@/types/story';

export interface IVariableResolver {
    resolve(context: PromptContext, ...params: string[]): Promise<string>;
}

export interface IVariableResolverRegistry {
    register(name: string, resolver: IVariableResolver): void;
    resolve(name: string, context: PromptContext, ...params: string[]): Promise<string>;
    has(name: string): boolean;
}

export interface ILorebookFormatter {
    formatEntries(entries: LorebookEntry[]): string;
}
