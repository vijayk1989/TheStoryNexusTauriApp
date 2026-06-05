import { Check, Copy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/lib/theme-provider";
import { cn } from "@/lib/utils";
import {
  CUSTOM_THEME_ID,
  DEFAULT_THEME_SETTINGS,
  THEME_COLOR_FIELDS,
  THEME_PRESETS,
  getEffectivePalette,
  isHexColor,
  type ThemePalette,
  type ThemePreset,
} from "@/features/theme/themePresets";

export function ThemeSettingsPanel() {
  const { colorThemeSettings, setColorThemeSettings } = useTheme();
  const effectivePalette = getEffectivePalette(colorThemeSettings);
  const isCustom = colorThemeSettings.presetId === CUSTOM_THEME_ID;

  const selectPreset = (preset: ThemePreset) => {
    setColorThemeSettings({
      ...colorThemeSettings,
      presetId: preset.id,
    });
  };

  const selectCustom = () => {
    setColorThemeSettings({
      presetId: CUSTOM_THEME_ID,
      customPalette: colorThemeSettings.customPalette,
    });
  };

  const copyCurrentToCustom = () => {
    setColorThemeSettings({
      presetId: CUSTOM_THEME_ID,
      customPalette: { ...effectivePalette },
    });
  };

  const resetCustom = () => {
    setColorThemeSettings({
      presetId: CUSTOM_THEME_ID,
      customPalette: { ...DEFAULT_THEME_SETTINGS.customPalette },
    });
  };

  const updateCustomColor = (key: keyof ThemePalette, value: string) => {
    if (!isHexColor(value)) return;

    setColorThemeSettings({
      presetId: CUSTOM_THEME_ID,
      customPalette: {
        ...colorThemeSettings.customPalette,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <h3 className="text-base font-semibold">Theme Presets</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {THEME_PRESETS.map((preset) => (
            <ThemePresetButton
              key={preset.id}
              name={preset.name}
              description={preset.description}
              palette={preset.palette}
              active={colorThemeSettings.presetId === preset.id}
              onClick={() => selectPreset(preset)}
            />
          ))}
          <ThemePresetButton
            name="Custom"
            description="Tune the app colors yourself."
            palette={colorThemeSettings.customPalette}
            active={isCustom}
            onClick={selectCustom}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">Custom Palette</h3>
            <p className="text-sm text-muted-foreground">Changes apply immediately.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={copyCurrentToCustom}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Current
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetCustom}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        <div className="grid gap-3">
          {THEME_COLOR_FIELDS.map((field) => {
            const value = colorThemeSettings.customPalette[field.key];
            return (
              <div
                key={field.key}
                className={cn(
                  "grid gap-2 rounded-md border border-border p-3 transition-opacity",
                  !isCustom && "opacity-65"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label htmlFor={`theme-${field.key}`}>{field.label}</Label>
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  </div>
                  <input
                    id={`theme-${field.key}`}
                    type="color"
                    value={value}
                    disabled={!isCustom}
                    onChange={(event) => updateCustomColor(field.key, event.target.value)}
                    className="h-9 w-12 shrink-0 cursor-pointer rounded border border-border bg-transparent disabled:cursor-not-allowed"
                    aria-label={`${field.label} color`}
                  />
                </div>
                <Input
                  value={value}
                  disabled={!isCustom}
                  readOnly
                  className="font-mono text-xs uppercase"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ThemePresetButton({
  name,
  description,
  palette,
  active,
  onClick,
}: {
  name: string;
  description: string;
  palette: ThemePalette;
  active: boolean;
  onClick: () => void;
}) {
  const swatches = [
    palette.background,
    palette.surface,
    palette.primary,
    palette.secondary,
    palette.accent,
  ];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-28 rounded-md border p-3 text-left transition-colors hover:border-primary/70 hover:bg-elevated",
        active ? "border-primary bg-primary/10" : "border-border bg-surface"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{name}</div>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
      </div>
      <div className="mt-3 flex overflow-hidden rounded border border-border">
        {swatches.map((swatch, index) => (
          <span
            key={`${swatch}-${index}`}
            className="h-6 flex-1"
            style={{ backgroundColor: swatch }}
          />
        ))}
      </div>
    </button>
  );
}
