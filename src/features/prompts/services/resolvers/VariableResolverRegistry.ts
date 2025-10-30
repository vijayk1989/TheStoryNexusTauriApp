import { PromptContext } from '@/types/story';
import { IVariableResolver, IVariableResolverRegistry } from './types';
import { attemptPromise } from '@jfdi/attempt';

export class VariableResolverRegistry implements IVariableResolverRegistry {
    private resolvers = new Map<string, IVariableResolver>();

    register(name: string, resolver: IVariableResolver): void {
        this.resolvers.set(name, resolver);
    }

    registerAlias(alias: string, targetName: string): void {
        const target = this.resolvers.get(targetName);
        if (target) {
            this.resolvers.set(alias, target);
        }
    }

    async resolve(name: string, context: PromptContext, ...params: string[]): Promise<string> {
        const resolver = this.resolvers.get(name);
        if (!resolver) {
            console.warn(`Unknown variable: ${name}`);
            return `[Unknown variable: ${name}]`;
        }

        const [error, result] = await attemptPromise(() =>
            resolver.resolve(context, ...params)
        );

        if (error) {
            console.error(`Error resolving variable ${name}:`, error);
            return `[Error: ${(error as Error).message}]`;
        }

        return result;
    }

    has(name: string): boolean {
        return this.resolvers.has(name);
    }
}
