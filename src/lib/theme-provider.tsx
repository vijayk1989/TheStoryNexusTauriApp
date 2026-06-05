import { createContext, useContext, useEffect, useState } from "react";
import {
    applyThemeSettings,
    DEFAULT_THEME_SETTINGS,
    getEffectiveAppearance,
    readThemeSettings,
    saveThemeSettings,
    type ThemeSettings,
} from "@/features/theme/themePresets";

type Theme = "dark" | "light";

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
};

type ThemeProviderState = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    colorThemeSettings: ThemeSettings;
    setColorThemeSettings: (settings: ThemeSettings) => void;
};

const initialState: ThemeProviderState = {
    theme: "light",
    setTheme: () => null,
    colorThemeSettings: DEFAULT_THEME_SETTINGS,
    setColorThemeSettings: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
    children,
    defaultTheme = "light",
    storageKey = "vite-ui-theme",
    ...props
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
    );
    const [colorThemeSettings, setColorThemeSettingsState] = useState<ThemeSettings>(
        () => readThemeSettings()
    );

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(theme);
        localStorage.setItem(storageKey, theme);
    }, [theme, storageKey]);

    useEffect(() => {
        applyThemeSettings(colorThemeSettings);
        setTheme(getEffectiveAppearance(colorThemeSettings));
    }, [colorThemeSettings]);

    const value = {
        theme,
        setTheme: (theme: Theme) => setTheme(theme),
        colorThemeSettings,
        setColorThemeSettings: (settings: ThemeSettings) => {
            saveThemeSettings(settings);
            setColorThemeSettingsState(settings);
        },
    };

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider");

    return context;
};
