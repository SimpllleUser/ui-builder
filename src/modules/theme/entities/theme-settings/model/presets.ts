import { ColorPreset, SemanticPreset, SurfacePreset, ThemeDensity, ThemeVariant } from './enums'

export interface BrandColors {
  primary: string
  secondary: string
}

export interface SemanticColors {
  success: string
  info: string
  warning: string
  error: string
}

export interface SurfaceColors {
  background: string
  surface: string
}

/** Default and Custom have no fixed colours: the first keeps the app's own, the second reads the user's picks. */
export type BrandPreset = Exclude<ColorPreset, ColorPreset.Default | ColorPreset.Custom>
export type SemanticColorPreset = Exclude<SemanticPreset, SemanticPreset.Default>

export const BRAND_COLORS: Record<BrandPreset, BrandColors> = {
  [ColorPreset.Blue]: { primary: '#1E88E5', secondary: '#FFCA28' },
  [ColorPreset.DeepPurple]: { primary: '#5E35B1', secondary: '#26C6DA' },
  [ColorPreset.Rose]: { primary: '#D81B60', secondary: '#26A69A' },
  [ColorPreset.Red]: { primary: '#E53935', secondary: '#42A5F5' },
  [ColorPreset.Orange]: { primary: '#F4511E', secondary: '#5C6BC0' },
  [ColorPreset.Amber]: { primary: '#FFB300', secondary: '#7E57C2' },
  [ColorPreset.Green]: { primary: '#43A047', secondary: '#FF7043' },
  [ColorPreset.Teal]: { primary: '#00897B', secondary: '#FFCA28' },
  [ColorPreset.BlueGrey]: { primary: '#546E7A', secondary: '#FFA726' },
  [ColorPreset.Stripe]: { primary: '#635BFF', secondary: '#00D4FF' },
  [ColorPreset.Discord]: { primary: '#5865F2', secondary: '#EB459E' },
  [ColorPreset.Twitch]: { primary: '#9146FF', secondary: '#00E6CB' },
  [ColorPreset.Figma]: { primary: '#F24E1E', secondary: '#0ACF83' },
}

export const SEMANTIC_COLORS: Record<SemanticColorPreset, SemanticColors> = {
  [SemanticPreset.Material]: { success: '#4CAF50', info: '#2196F3', warning: '#FB8C00', error: '#F44336' },
  [SemanticPreset.Modern]: { success: '#22C55E', info: '#3B82F6', warning: '#F59E0B', error: '#EF4444' },
  [SemanticPreset.Pastel]: { success: '#81C784', info: '#64B5F6', warning: '#FFB74D', error: '#E57373' },
  [SemanticPreset.Vibrant]: { success: '#00E676', info: '#00B0FF', warning: '#FFEA00', error: '#FF1744' },
  [SemanticPreset.Nordic]: { success: '#8FBC8F', info: '#5F9EA0', warning: '#F4A460', error: '#CD5C5C' },
  [SemanticPreset.Corporate]: { success: '#2E7D32', info: '#0277BD', warning: '#F9A825', error: '#C62828' },
  [SemanticPreset.Cyberpunk]: { success: '#00FF9D', info: '#00E5FF', warning: '#FFEA00', error: '#FF003C' },
  [SemanticPreset.Brutal]: { success: '#00C853', info: '#2962FF', warning: '#FFD600', error: '#D50000' },
}

export const SURFACE_COLORS: Record<
  Exclude<SurfacePreset, SurfacePreset.Default>,
  Record<ThemeVariant, SurfaceColors>
> = {
  [SurfacePreset.Zinc]: {
    [ThemeVariant.Light]: { background: '#FAFAFA', surface: '#FFFFFF' },
    [ThemeVariant.Dark]: { background: '#09090B', surface: '#18181B' },
  },
  [SurfacePreset.Slate]: {
    [ThemeVariant.Light]: { background: '#F8FAFC', surface: '#FFFFFF' },
    [ThemeVariant.Dark]: { background: '#0F172A', surface: '#1E293B' },
  },
}

/** Corner radius in pixels. Null leaves each Vuetify component with its own radius. */
export const RADIUS_VALUES = [null, 0, 4, 8, 12, 16, 24]

export const DEFAULT_CUSTOM_PRIMARY = '#2196F3'
export const DEFAULT_CUSTOM_SECONDARY = '#03A9F4'

/** The density names Vuetify understands; Default leaves the components as they are. */
export const VUETIFY_DENSITY: Record<Exclude<ThemeDensity, ThemeDensity.Default>, string> = {
  [ThemeDensity.Comfortable]: 'comfortable',
  [ThemeDensity.Compact]: 'compact',
}

export const isBrandPreset = (preset: ColorPreset): preset is BrandPreset => preset in BRAND_COLORS
export const isSemanticColorPreset = (preset: SemanticPreset): preset is SemanticColorPreset =>
  preset in SEMANTIC_COLORS
