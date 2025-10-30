import { attemptPromise } from '@jfdi/attempt';

export class StreamProcessor {
    static async processStream(
        response: Response,
        onToken: (token: string) => void,
        onComplete: () => void,
        onError: (error: Error) => void
    ): Promise<void> {
        if (!response.body) {
            onError(new Error('Response body is null'));
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const [error] = await attemptPromise(async () => {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    onComplete();
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                onToken(chunk);
            }
        });

        reader.releaseLock();

        if (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('Stream was aborted');
                onComplete();
            } else {
                onError(error instanceof Error ? error : new Error(String(error)));
            }
        }
    }
}
