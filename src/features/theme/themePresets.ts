export type ThemeAppearance = "dark" | "light";

export type ThemePalette = {
  background: string;
  surface: string;
  elevated: string;
  foreground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
};

export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  appearance: ThemeAppearance;
  palette: ThemePalette;
};

export type ThemeSettings = {
  presetId: string;
  customPalette: ThemePalette;
};

export type ThemeColorField = {
  key: keyof ThemePalette;
  label: string;
  description: string;
};

export const THEME_STORAGE_KEY = "story-nexus-theme-v1";
export const CUSTOM_THEME_ID = "custom";

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "story-nexus",
    name: "Story Nexus",
    description: "The current dark editorial palette.",
    appearance: "dark",
    palette: {
      background: "#0f1116",
      surface: "#171b21",
      elevated: "#1e2430",
      foreground: "#f3efe7",
      primary: "#d2aa6b",
      primaryForeground: "#0f1116",
      secondary: "#6ee7f9",
      secondaryForeground: "#0f1116",
      muted: "#1e2430",
      mutedForeground: "#b5b0a9",
      accent: "#4fad8b",
      accentForeground: "#0f1116",
      destructive: "#c92323",
      destructiveForeground: "#f3efe7",
      border: "#2a3040",
    },
  },
  {
    id: "solarized-dark",
    name: "Solarized Dark",
    description: "Low-glare blue-green contrast.",
    appearance: "dark",
    palette: {
      background: "#002b36",
      surface: "#073642",
      elevated: "#0c4655",
      foreground: "#eee8d5",
      primary: "#b58900",
      primaryForeground: "#002b36",
      secondary: "#2aa198",
      secondaryForeground: "#002b36",
      muted: "#073642",
      mutedForeground: "#93a1a1",
      accent: "#859900",
      accentForeground: "#002b36",
      destructive: "#dc322f",
      destructiveForeground: "#fdf6e3",
      border: "#586e75",
    },
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    description: "Warm paper tones with blue accents.",
    appearance: "light",
    palette: {
      background: "#fdf6e3",
      surface: "#eee8d5",
      elevated: "#e5dcc2",
      foreground: "#073642",
      primary: "#268bd2",
      primaryForeground: "#fdf6e3",
      secondary: "#2aa198",
      secondaryForeground: "#fdf6e3",
      muted: "#eee8d5",
      mutedForeground: "#657b83",
      accent: "#859900",
      accentForeground: "#fdf6e3",
      destructive: "#dc322f",
      destructiveForeground: "#fdf6e3",
      border: "#93a1a1",
    },
  },
  {
    id: "high-contrast",
    name: "High Contrast",
    description: "Sharper separation for dense writing sessions.",
    appearance: "dark",
    palette: {
      background: "#050505",
      surface: "#111111",
      elevated: "#1f2937",
      foreground: "#fafafa",
      primary: "#facc15",
      primaryForeground: "#050505",
      secondary: "#38bdf8",
      secondaryForeground: "#050505",
      muted: "#262626",
      mutedForeground: "#d4d4d4",
      accent: "#22c55e",
      accentForeground: "#050505",
      destructive: "#ef4444",
      destructiveForeground: "#fafafa",
      border: "#525252",
    },
  },
];

export const THEME_COLOR_FIELDS: ThemeColorField[] = [
  { key: "background", label: "Background", description: "Main app canvas" },
  { key: "surface", label: "Surface", description: "Sidebars and panels" },
  { key: "elevated", label: "Elevated", description: "Sheets, popovers, active rows" },
  { key: "foreground", label: "Text", description: "Primary text" },
  { key: "mutedForeground", label: "Muted Text", description: "Secondary text" },
  { key: "primary", label: "Primary", description: "Primary actions and highlights" },
  { key: "primaryForeground", label: "Primary Text", description: "Text on primary controls" },
  { key: "secondary", label: "Secondary", description: "Supporting accents" },
  { key: "accent", label: "Accent", description: "Hover and contextual accents" },
  { key: "border", label: "Border", description: "Dividers and input outlines" },
  { key: "destructive", label: "Destructive", description: "Delete and danger actions" },
];

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  presetId: "story-nexus",
  customPalette: { ...THEME_PRESETS[0].palette },
};

export function getThemePreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((preset) => preset.id === id);
}

export function getEffectivePalette(settings: ThemeSettings): ThemePalette {
  if (settings.presetId === CUSTOM_THEME_ID) {
    return normalizePalette(settings.customPalette);
  }

  return getThemePreset(settings.presetId)?.palette ?? THEME_PRESETS[0].palette;
}

export function getEffectiveAppearance(settings: ThemeSettings): ThemeAppearance {
  if (settings.presetId !== CUSTOM_THEME_ID) {
    return getThemePreset(settings.presetId)?.appearance ?? "dark";
  }

  return getRelativeLuminance(settings.customPalette.background) > 0.5 ? "light" : "dark";
}

export function readThemeSettings(storage: Storage = localStorage): ThemeSettings {
  try {
    const stored = storage.getItem(THEME_STORAGE_KEY);
    if (!stored) return DEFAULT_THEME_SETTINGS;

    const parsed = JSON.parse(stored) as Partial<ThemeSettings>;
    return normalizeThemeSettings(parsed);
  } catch {
    return DEFAULT_THEME_SETTINGS;
  }
}

export function saveThemeSettings(settings: ThemeSettings, storage: Storage = localStorage): void {
  storage.setItem(THEME_STORAGE_KEY, JSON.stringify(normalizeThemeSettings(settings)));
}

export function applyThemeSettings(settings: ThemeSettings, root: HTMLElement = document.documentElement): void {
  const palette = getEffectivePalette(settings);
  const vars = buildCssVariableMap(palette);

  Object.entries(vars).forEach(([name, value]) => {
    root.style.setProperty(`--${name}`, value);
  });
}

export function normalizeThemeSettings(settings: Partial<ThemeSettings>): ThemeSettings {
  const presetId = settings.presetId === CUSTOM_THEME_ID || getThemePreset(settings.presetId || "")
    ? settings.presetId!
    : DEFAULT_THEME_SETTINGS.presetId;

  return {
    presetId,
    customPalette: normalizePalette(settings.customPalette),
  };
}

export function normalizePalette(palette?: Partial<ThemePalette>): ThemePalette {
  const fallback = DEFAULT_THEME_SETTINGS.customPalette;
  return Object.fromEntries(
    Object.entries(fallback).map(([key, value]) => [
      key,
      isHexColor(palette?.[key as keyof ThemePalette]) ? palette?.[key as keyof ThemePalette] : value,
    ])
  ) as ThemePalette;
}

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function hexToHslTriplet(hex: string): string {
  const normalized = isHexColor(hex) ? hex : "#000000";
  const red = parseInt(normalized.slice(1, 3), 16) / 255;
  const green = parseInt(normalized.slice(3, 5), 16) / 255;
  const blue = parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  if (max === min) {
    return `0 0% ${Math.round(lightness * 100)}%`;
  }

  const delta = max - min;
  const saturation = lightness > 0.5
    ? delta / (2 - max - min)
    : delta / (max + min);
  let hue = 0;

  if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
  if (max === green) hue = (blue - red) / delta + 2;
  if (max === blue) hue = (red - green) / delta + 4;
  hue /= 6;

  return `${Math.round(hue * 360)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

function buildCssVariableMap(palette: ThemePalette): Record<string, string> {
  return {
    background: hexToHslTriplet(palette.background),
    surface: hexToHslTriplet(palette.surface),
    elevated: hexToHslTriplet(palette.elevated),
    foreground: hexToHslTriplet(palette.foreground),
    card: hexToHslTriplet(palette.surface),
    "card-foreground": hexToHslTriplet(palette.foreground),
    popover: hexToHslTriplet(palette.elevated),
    "popover-foreground": hexToHslTriplet(palette.foreground),
    primary: hexToHslTriplet(palette.primary),
    "primary-foreground": hexToHslTriplet(palette.primaryForeground),
    secondary: hexToHslTriplet(palette.secondary),
    "secondary-foreground": hexToHslTriplet(palette.secondaryForeground),
    muted: hexToHslTriplet(palette.muted),
    "muted-foreground": hexToHslTriplet(palette.mutedForeground),
    accent: hexToHslTriplet(palette.accent),
    "accent-foreground": hexToHslTriplet(palette.accentForeground),
    destructive: hexToHslTriplet(palette.destructive),
    "destructive-foreground": hexToHslTriplet(palette.destructiveForeground),
    border: hexToHslTriplet(palette.border),
    input: hexToHslTriplet(palette.border),
    ring: hexToHslTriplet(palette.primary),
    "chart-1": hexToHslTriplet(palette.primary),
    "chart-2": hexToHslTriplet(palette.secondary),
    "chart-3": hexToHslTriplet(palette.accent),
    "chart-4": hexToHslTriplet(palette.destructive),
    "chart-5": hexToHslTriplet(palette.mutedForeground),
    "sidebar-background": hexToHslTriplet(palette.surface),
    "sidebar-foreground": hexToHslTriplet(palette.foreground),
    "sidebar-primary": hexToHslTriplet(palette.primary),
    "sidebar-primary-foreground": hexToHslTriplet(palette.primaryForeground),
    "sidebar-accent": hexToHslTriplet(palette.elevated),
    "sidebar-accent-foreground": hexToHslTriplet(palette.foreground),
    "sidebar-border": hexToHslTriplet(palette.border),
    "sidebar-ring": hexToHslTriplet(palette.primary),
    "shadow-glow": `0 0 24px ${hexToRgba(palette.secondary, 0.14)}`,
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = isHexColor(hex) ? hex : "#000000";
  const red = parseInt(normalized.slice(1, 3), 16);
  const green = parseInt(normalized.slice(3, 5), 16);
  const blue = parseInt(normalized.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getRelativeLuminance(hex: string): number {
  if (!isHexColor(hex)) return 0;
  const values = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });

  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
