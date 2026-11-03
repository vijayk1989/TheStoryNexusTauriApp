import { db } from '@/services/database';

const writes = new Map<string, Promise<unknown>>();

export function saveBrainstormInput(chatId: string, draftInput: string): Promise<void> {
    const previous = writes.get(chatId) || Promise.resolve();
    const writing = previous.catch(() => {}).then(async () => {
        await db.aiChats.update(chatId, { draftInput });
    });
    writes.set(chatId, writing);
    void writing.finally(() => {
        if (writes.get(chatId) === writing) writes.delete(chatId);
    }).catch(() => {});
    return writing;
}

export async function flushBrainstormInputs(): Promise<void> {
    await Promise.all([...writes.values()]);
}
