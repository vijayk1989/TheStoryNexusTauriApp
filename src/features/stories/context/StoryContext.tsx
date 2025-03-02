import React, { createContext, useContext, useState, ReactNode } from 'react';

interface StoryContextType {
    currentStoryId: string | null;
    currentChapterId: string | null;
    setCurrentStoryId: (storyId: string | null) => void;
    setCurrentChapterId: (chapterId: string | null) => void;
    resetContext: () => void;
}

const StoryContext = createContext<StoryContextType | undefined>(undefined);

export function StoryProvider({ children }: { children: ReactNode }) {
    const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
    const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);

    const resetContext = () => {
        setCurrentStoryId(null);
        setCurrentChapterId(null);
    };

    return (
        <StoryContext.Provider value={{
            currentStoryId,
            currentChapterId,
            setCurrentStoryId,
            setCurrentChapterId,
            resetContext
        }}>
            {children}
        </StoryContext.Provider>
    );
}

export function useStoryContext() {
    const context = useContext(StoryContext);
    if (!context) {
        throw new Error('useStoryContext must be used within a StoryProvider');
    }
    return context;
} 