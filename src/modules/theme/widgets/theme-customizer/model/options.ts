import {
  BRAND_COLORS,
  BASE_THEME_COLORS,
  CardStyle,
  ColorPreset,
  DesignPreset,
  FieldStyle,
  FONTS,
  FontFamily,
  SpacingScale,
  TypographyStyle,
  InteractiveStyle,
  SEMANTIC_COLORS,
  isBrandPreset,
  isSemanticColorPreset,
  type BrandPreset,
  type SemanticColorPreset,
  SemanticPreset,
  ShadowProfile,
  SurfacePreset,
  ThemeDensity,
  ThemeMode,
  ThemeVariant,
} from '../../../entities/theme-settings'

export interface ToggleOption<Value> {
  value: Value
  label: string
  icon?: string
}

/** A choice shown as a tile with a few colour dots. */
export interface SwatchOption<Value> {
  value: Value
  label: string
  colors: string[]
}

export const MODE_OPTIONS: ToggleOption<ThemeMode>[] = [
  { value: ThemeMode.Light, label: 'Light', icon: 'mdi-white-balance-sunny' },
  { value: ThemeMode.Dark, label: 'Dark', icon: 'mdi-weather-night' },
  { value: ThemeMode.System, label: 'System', icon: 'mdi-monitor' },
]

export const DENSITY_OPTIONS: ToggleOption<ThemeDensity>[] = [
  { value: ThemeDensity.Default, label: 'Spacious', icon: 'mdi-format-line-spacing' },
  { value: ThemeDensity.Comfortable, label: 'Comfortable', icon: 'mdi-format-list-text' },
  { value: ThemeDensity.Compact, label: 'Compact', icon: 'mdi-view-headline' },
]

export const CARD_STYLE_OPTIONS: ToggleOption<CardStyle>[] = [
  { value: CardStyle.Elevated, label: 'Shadows', icon: 'mdi-layers' },
  { value: CardStyle.Outlined, label: 'Outlined', icon: 'mdi-border-all' },
]

export const SHADOW_PROFILE_OPTIONS: ToggleOption<ShadowProfile>[] = [
  { value: ShadowProfile.Default, label: 'Default' },
  { value: ShadowProfile.Soft, label: 'Soft' },
  { value: ShadowProfile.Crisp, label: 'Crisp' },
  { value: ShadowProfile.NeoBrutal, label: 'Neo-brutal' },
]

export const INTERACTIVE_STYLE_OPTIONS: ToggleOption<InteractiveStyle>[] = [
  { value: InteractiveStyle.Material, label: 'Material', icon: 'mdi-animation-play' },
  { value: InteractiveStyle.Modern, label: 'Modern', icon: 'mdi-cursor-default-click' },
]

const BASE_LIGHT = BASE_THEME_COLORS[ThemeVariant.Light]

const COLOR_PRESET_LABELS: Record<BrandPreset, string> = {
  [ColorPreset.Ink]: 'Ink',
  [ColorPreset.Blue]: 'Blue',
  [ColorPreset.DeepPurple]: 'Deep purple',
  [ColorPreset.Rose]: 'Rose',
  [ColorPreset.Red]: 'Red',
  [ColorPreset.Orange]: 'Orange',
  [ColorPreset.Amber]: 'Amber',
  [ColorPreset.Green]: 'Green',
  [ColorPreset.Teal]: 'Teal',
  [ColorPreset.BlueGrey]: 'Blue grey',
  [ColorPreset.Stripe]: 'Stripe',
  [ColorPreset.Discord]: 'Discord',
  [ColorPreset.Twitch]: 'Twitch',
  [ColorPreset.Figma]: 'Figma',
}

export const COLOR_PRESET_OPTIONS: SwatchOption<ColorPreset>[] = [
  { value: ColorPreset.Default, label: 'Default', colors: [BASE_LIGHT.primary, BASE_LIGHT.secondary] },
  ...Object.values(ColorPreset)
    .filter(isBrandPreset)
    .map(preset => ({
      value: preset,
      label: COLOR_PRESET_LABELS[preset],
      colors: [BRAND_COLORS[preset].primary, BRAND_COLORS[preset].secondary],
    })),
]

const SEMANTIC_ORDER = ['success', 'info', 'warning', 'error'] as const

const SEMANTIC_LABELS: Record<SemanticColorPreset, string> = {
  [SemanticPreset.Material]: 'Material',
  [SemanticPreset.Modern]: 'Modern',
  [SemanticPreset.Pastel]: 'Pastel',
  [SemanticPreset.Vibrant]: 'Vibrant',
  [SemanticPreset.Nordic]: 'Nordic',
  [SemanticPreset.Corporate]: 'Corporate',
  [SemanticPreset.Cyberpunk]: 'Cyberpunk',
  [SemanticPreset.Brutal]: 'Brutal',
}

export const SEMANTIC_PRESET_OPTIONS: SwatchOption<SemanticPreset>[] = [
  { value: SemanticPreset.Default, label: 'Default', colors: SEMANTIC_ORDER.map(name => BASE_LIGHT[name]) },
  ...Object.values(SemanticPreset)
    .filter(isSemanticColorPreset)
    .map(preset => ({
      value: preset,
      label: SEMANTIC_LABELS[preset],
      colors: SEMANTIC_ORDER.map(name => SEMANTIC_COLORS[preset][name]),
    })),
]

export const SURFACE_PRESET_OPTIONS: SwatchOption<SurfacePreset>[] = [
  {
    value: SurfacePreset.Default,
    label: 'Default',
    colors: [BASE_LIGHT.background, BASE_LIGHT.surface, BASE_THEME_COLORS[ThemeVariant.Dark].background],
  },
  { value: SurfacePreset.Zinc, label: 'Zinc', colors: ['#FAFAFA', '#FFFFFF', '#09090B'] },
  { value: SurfacePreset.Slate, label: 'Slate', colors: ['#F8FAFC', '#FFFFFF', '#0F172A'] },
]

export const RADIUS_OPTIONS = [
  { value: null, title: 'Default' },
  { value: 0, title: 'None (0 px)' },
  { value: 4, title: 'Small (4 px)' },
  { value: 8, title: 'Medium (8 px)' },
  { value: 12, title: 'Large (12 px)' },
  { value: 16, title: 'Extra large (16 px)' },
  { value: 24, title: 'Full (24 px)' },
]

export const TYPOGRAPHY_OPTIONS: ToggleOption<TypographyStyle>[] = [
  { value: TypographyStyle.Default, label: 'Default' },
  { value: TypographyStyle.Modern, label: 'Modern' },
  { value: TypographyStyle.Friendly, label: 'Friendly' },
  { value: TypographyStyle.Editorial, label: 'Editorial' },
  { value: TypographyStyle.Bold, label: 'Bold' },
]

export const SPACING_OPTIONS: ToggleOption<SpacingScale>[] = [
  { value: SpacingScale.Default, label: 'Default' },
  { value: SpacingScale.Tight, label: 'Tight' },
  { value: SpacingScale.Balanced, label: 'Balanced' },
  { value: SpacingScale.Airy, label: 'Airy' },
]

export const FIELD_STYLE_OPTIONS: ToggleOption<FieldStyle>[] = [
  { value: FieldStyle.Default, label: 'Default' },
  { value: FieldStyle.Refined, label: 'Refined' },
  { value: FieldStyle.Filled, label: 'Filled' },
]

export const DESIGN_PRESET_LABELS: Record<DesignPreset, { label: string; description: string }> = {
  [DesignPreset.Material]: { label: 'Material', description: 'The Vuetify look' },
  [DesignPreset.Minimal]: { label: 'Minimal', description: 'Black and white, thin borders' },
  [DesignPreset.Soft]: { label: 'Soft', description: 'Round, roomy, light shadows' },
  [DesignPreset.Editorial]: { label: 'Editorial', description: 'Serif headings, lots of air' },
  [DesignPreset.Dashboard]: { label: 'Dashboard', description: 'Compact, for dense data' },
  [DesignPreset.Bold]: { label: 'Bold', description: 'Heavy type, hard shadows' },
}

export interface FontOption {
  value: FontFamily
  title: string
  /** The font itself, so each choice is shown in its own letters. */
  stack: string
}

export const FONT_OPTIONS: FontOption[] = Object.values(FontFamily).map(value =>
  value === FontFamily.Default
    ? { value, title: 'From typography style', stack: 'inherit' }
    : { value, title: FONTS[value].label, stack: FONTS[value].stack },
)
