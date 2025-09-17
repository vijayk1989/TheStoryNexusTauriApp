import { useEffect } from 'react';

type HotkeyCallback = () => void;

interface HotkeyOptions {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
}

export function useGlobalHotkey(options: HotkeyOptions, callback: HotkeyCallback) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                event.key.toLowerCase() === options.key.toLowerCase() &&
                (options.ctrlKey === undefined || event.ctrlKey === options.ctrlKey) &&
                (options.shiftKey === undefined || event.shiftKey === options.shiftKey) &&
                (options.altKey === undefined || event.altKey === options.altKey)
            ) {
                event.preventDefault();
                callback();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [options, callback]);
}
