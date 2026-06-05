import { describe, expect, it } from "vitest";
import {
  CUSTOM_THEME_ID,
  DEFAULT_THEME_SETTINGS,
  applyThemeSettings,
  getEffectiveAppearance,
  hexToHslTriplet,
  normalizeThemeSettings,
} from "@/features/theme/themePresets";

describe("theme presets", () => {
  it("converts hex colors to HSL variable values", () => {
    expect(hexToHslTriplet("#000000")).toBe("0 0% 0%");
    expect(hexToHslTriplet("#ffffff")).toBe("0 0% 100%");
    expect(hexToHslTriplet("#ff0000")).toBe("0 100% 50%");
  });

  it("normalizes invalid stored settings back to a usable theme", () => {
    const settings = normalizeThemeSettings({
      presetId: "missing-theme",
      customPalette: {
        ...DEFAULT_THEME_SETTINGS.customPalette,
        primary: "not-a-color",
      },
    });

    expect(settings.presetId).toBe(DEFAULT_THEME_SETTINGS.presetId);
    expect(settings.customPalette.primary).toBe(DEFAULT_THEME_SETTINGS.customPalette.primary);
  });

  it("applies custom theme variables to a root element", () => {
    const root = document.createElement("div");
    const settings = {
      presetId: CUSTOM_THEME_ID,
      customPalette: {
        ...DEFAULT_THEME_SETTINGS.customPalette,
        background: "#ffffff",
        primary: "#ff0000",
      },
    };

    applyThemeSettings(settings, root);

    expect(root.style.getPropertyValue("--background")).toBe("0 0% 100%");
    expect(root.style.getPropertyValue("--primary")).toBe("0 100% 50%");
    expect(getEffectiveAppearance(settings)).toBe("light");
  });
});
