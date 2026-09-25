import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { toast } from 'react-toastify';
import { CopyLorebookMarkdownButton } from '@/features/lorebook/components/CopyLorebookMarkdownButton';
import type { LorebookEntry } from '@/types/story';

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/features/lorebook/stores/useLorebookStore', () => ({
    useLorebookStore: (selector: (state: { entries: LorebookEntry[] }) => unknown) => selector({ entries: [] }),
}));

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

const entry: LorebookEntry = {
    id: 'a', storyId: 's', createdAt: new Date(), updatedAt: new Date(),
    name: 'Aster', category: 'character', aliases: [], tags: [], description: 'Full description.',
};

test('copies an entry without toggling its parent and reports success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const onClick = vi.fn();
    render(createElement('div', { onClick }, createElement(CopyLorebookMarkdownButton, { entries: [entry], compact: true })));
    fireEvent.click(screen.getByRole('button', { name: 'Copy Aster as Markdown' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Copied as Markdown'));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('## Description\n\nFull description.'));
    expect(onClick).not.toHaveBeenCalled();
});

test('reports clipboard failure and allows retry', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    render(createElement(CopyLorebookMarkdownButton, { entries: [entry] }));
    const button = screen.getByRole('button', { name: 'Copy all as Markdown' }) as HTMLButtonElement;
    fireEvent.click(button);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
    expect(button.disabled).toBe(false);
});
