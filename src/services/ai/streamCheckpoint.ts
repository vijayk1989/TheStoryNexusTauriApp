/** Coalesce streaming snapshots while keeping database writes in order. */
export function createStreamCheckpoint<T>(
    persist: (snapshot: T) => Promise<void>,
    onError: (error: unknown) => void,
    intervalMs = 1000,
) {
    let pending: { snapshot: T } | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let writing = Promise.resolve();

    const write = () => {
        if (!pending) return writing;
        const { snapshot } = pending;
        pending = undefined;
        writing = writing.catch(() => {}).then(() => persist(snapshot));
        return writing;
    };

    return {
        schedule(snapshot: T) {
            pending = { snapshot };
            if (timer === undefined) {
                timer = setTimeout(() => {
                    timer = undefined;
                    void write().catch(onError);
                }, intervalMs);
            }
        },
        async flush() {
            clearTimeout(timer);
            timer = undefined;
            await write();
        },
    };
}
