import { afterEach, describe, expect, test, vi } from 'vitest';
import { createStreamCheckpoint } from '@/services/ai/streamCheckpoint';

afterEach(() => vi.useRealTimers());

describe('stream checkpoints', () => {
    test('saves the latest text periodically even if the stream never completes', async () => {
        vi.useFakeTimers();
        const persist = vi.fn().mockResolvedValue(undefined);
        const checkpoint = createStreamCheckpoint(persist, vi.fn());
        checkpoint.schedule('First');
        await vi.advanceTimersByTimeAsync(500);
        checkpoint.schedule('First second');
        await vi.advanceTimersByTimeAsync(500);
        expect(persist.mock.calls).toEqual([['First second']]);
        checkpoint.schedule('First second third');
        await checkpoint.flush();
        await vi.runAllTimersAsync();
        expect(persist.mock.calls).toEqual([['First second'], ['First second third']]);
    });

    test('waits for an older save before flushing the final partial response', async () => {
        vi.useFakeTimers();
        let finishFirst!: () => void;
        const persist = vi.fn()
            .mockImplementationOnce(() => new Promise<void>(resolve => { finishFirst = resolve; }))
            .mockResolvedValue(undefined);
        const checkpoint = createStreamCheckpoint(persist, vi.fn());
        checkpoint.schedule('Old checkpoint');
        await vi.advanceTimersByTimeAsync(1000);
        checkpoint.schedule('Final partial response');
        const flushed = checkpoint.flush();
        expect(persist).toHaveBeenCalledTimes(1);
        finishFirst();
        await flushed;
        expect(persist.mock.calls).toEqual([['Old checkpoint'], ['Final partial response']]);
    });

    test('reports background failures and retries the latest content at final flush', async () => {
        vi.useFakeTimers();
        const error = new Error('Storage unavailable');
        const persist = vi.fn().mockRejectedValueOnce(error).mockResolvedValue(undefined);
        const onError = vi.fn();
        const checkpoint = createStreamCheckpoint(persist, onError);
        checkpoint.schedule('Partial');
        await vi.advanceTimersByTimeAsync(1000);
        expect(onError).toHaveBeenCalledWith(error);
        checkpoint.schedule('Partial');
        await checkpoint.flush();
        expect(persist).toHaveBeenCalledTimes(2);
    });

    test('propagates a final save failure so callers can warn the user', async () => {
        const checkpoint = createStreamCheckpoint(async () => { throw new Error('Disk full'); }, vi.fn());
        checkpoint.schedule('Keep this visible');
        await expect(checkpoint.flush()).rejects.toThrow('Disk full');
    });
});
