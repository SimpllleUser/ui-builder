import {
  CardStyle,
  ColorPreset,
  DesignPreset,
  FieldStyle,
  FontFamily,
  InteractiveStyle,
  SemanticPreset,
  ShadowProfile,
  SpacingScale,
  SurfacePreset,
  ThemeDensity,
  TypographyStyle,
} from './enums'
import { DEFAULT_THEME_SETTINGS, type ThemeSettings } from './themeSettings'

/** Everything a preset decides. Light or dark mode and the user's custom colours are not part of a look. */
export type DesignLook = Omit<ThemeSettings, 'mode' | 'customPrimary' | 'customSecondary'>

const { mode: _mode, customPrimary: _primary, customSecondary: _secondary, ...MATERIAL_LOOK } = DEFAULT_THEME_SETTINGS

export const DESIGN_PRESETS: Record<DesignPreset, DesignLook> = {
  [DesignPreset.Material]: MATERIAL_LOOK,
  [DesignPreset.Minimal]: {
    colorPreset: ColorPreset.Ink,
    semanticPreset: SemanticPreset.Modern,
    surfacePreset: SurfacePreset.Zinc,
    radius: 8,
    density: ThemeDensity.Default,
    cardStyle: CardStyle.Outlined,
    shadowProfile: ShadowProfile.Crisp,
    interactiveStyle: InteractiveStyle.Modern,
    typography: TypographyStyle.Modern,
    spacing: SpacingScale.Balanced,
    fieldStyle: FieldStyle.Refined,
    headingFont: FontFamily.Default,
    bodyFont: FontFamily.Default,
  },
  [DesignPreset.Soft]: {
    colorPreset: ColorPreset.Stripe,
    semanticPreset: SemanticPreset.Modern,
    surfacePreset: SurfacePreset.Slate,
    radius: 16,
    density: ThemeDensity.Default,
    cardStyle: CardStyle.Elevated,
    shadowProfile: ShadowProfile.Soft,
    interactiveStyle: InteractiveStyle.Modern,
    typography: TypographyStyle.Friendly,
    spacing: SpacingScale.Airy,
    fieldStyle: FieldStyle.Filled,
    headingFont: FontFamily.Default,
    bodyFont: FontFamily.Default,
  },
  [DesignPreset.Editorial]: {
    colorPreset: ColorPreset.Teal,
    semanticPreset: SemanticPreset.Nordic,
    surfacePreset: SurfacePreset.Zinc,
    radius: 4,
    density: ThemeDensity.Default,
    cardStyle: CardStyle.Outlined,
    shadowProfile: ShadowProfile.Default,
    interactiveStyle: InteractiveStyle.Modern,
    typography: TypographyStyle.Editorial,
    spacing: SpacingScale.Airy,
    fieldStyle: FieldStyle.Refined,
    headingFont: FontFamily.Default,
    bodyFont: FontFamily.Default,
  },
  [DesignPreset.Dashboard]: {
    colorPreset: ColorPreset.Blue,
    semanticPreset: SemanticPreset.Modern,
    surfacePreset: SurfacePreset.Slate,
    radius: 8,
    density: ThemeDensity.Compact,
    cardStyle: CardStyle.Outlined,
    shadowProfile: ShadowProfile.Default,
    interactiveStyle: InteractiveStyle.Modern,
    typography: TypographyStyle.Modern,
    spacing: SpacingScale.Tight,
    fieldStyle: FieldStyle.Refined,
    headingFont: FontFamily.Default,
    bodyFont: FontFamily.Default,
  },
  [DesignPreset.Bold]: {
    colorPreset: ColorPreset.Amber,
    semanticPreset: SemanticPreset.Brutal,
    surfacePreset: SurfacePreset.Zinc,
    radius: 8,
    density: ThemeDensity.Default,
    cardStyle: CardStyle.Elevated,
    shadowProfile: ShadowProfile.NeoBrutal,
    interactiveStyle: InteractiveStyle.Modern,
    typography: TypographyStyle.Bold,
    spacing: SpacingScale.Balanced,
    fieldStyle: FieldStyle.Default,
    headingFont: FontFamily.Default,
    bodyFont: FontFamily.Default,
  },
}

export const applyDesignPreset = (settings: ThemeSettings, preset: DesignPreset): ThemeSettings => ({
  ...settings,
  ...DESIGN_PRESETS[preset],
})

/** The preset the settings are exactly equal to, or null once the user has changed something of it. */
export function matchingDesignPreset(settings: ThemeSettings): DesignPreset | null {
  const matches = (look: DesignLook) =>
    Object.entries(look).every(([name, value]) => settings[name as keyof DesignLook] === value)
  return Object.values(DesignPreset).find(preset => matches(DESIGN_PRESETS[preset])) ?? null
}
