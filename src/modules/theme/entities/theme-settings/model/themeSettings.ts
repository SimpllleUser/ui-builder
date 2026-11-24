import {
  CardStyle,
  ColorPreset,
  InteractiveStyle,
  SemanticPreset,
  SurfacePreset,
  ShadowProfile,
  ThemeDensity,
  ThemeMode,
} from './enums'
import { DEFAULT_CUSTOM_PRIMARY, DEFAULT_CUSTOM_SECONDARY, RADIUS_VALUES } from './presets'
import { isHexColor } from '../../../../../shared/lib/hexColor'

export interface ThemeSettings {
  mode: ThemeMode
  colorPreset: ColorPreset
  customPrimary: string
  customSecondary: string
  semanticPreset: SemanticPreset
  surfacePreset: SurfacePreset
  /** Corner radius in pixels; null keeps each component's own. */
  radius: number | null
  density: ThemeDensity
  cardStyle: CardStyle
  shadowProfile: ShadowProfile
  interactiveStyle: InteractiveStyle
}

/** Nothing customised: the app looks the way it did before theme settings existed. */
export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: ThemeMode.System,
  colorPreset: ColorPreset.Default,
  customPrimary: DEFAULT_CUSTOM_PRIMARY,
  customSecondary: DEFAULT_CUSTOM_SECONDARY,
  semanticPreset: SemanticPreset.Default,
  surfacePreset: SurfacePreset.Default,
  radius: null,
  density: ThemeDensity.Default,
  cardStyle: CardStyle.Elevated,
  shadowProfile: ShadowProfile.Default,
  interactiveStyle: InteractiveStyle.Material,
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

function pickEnum<T extends string>(members: Record<string, T>, value: unknown, fallback: T): T {
  return Object.values(members).find(member => member === value) ?? fallback
}

/**
 * Settings from anywhere outside the code (the browser's storage, a pasted file) cannot be trusted:
 * a wrong or missing field falls back to its default instead of breaking the theme.
 */
export function sanitizeThemeSettings(raw: unknown): ThemeSettings {
  const source = isRecord(raw) ? raw : {}
  const defaults = DEFAULT_THEME_SETTINGS
  const color = (value: unknown, fallback: string) =>
    typeof value === 'string' && isHexColor(value) ? value : fallback
  return {
    mode: pickEnum(ThemeMode, source.mode, defaults.mode),
    colorPreset: pickEnum(ColorPreset, source.colorPreset, defaults.colorPreset),
    customPrimary: color(source.customPrimary, defaults.customPrimary),
    customSecondary: color(source.customSecondary, defaults.customSecondary),
    semanticPreset: pickEnum(SemanticPreset, source.semanticPreset, defaults.semanticPreset),
    surfacePreset: pickEnum(SurfacePreset, source.surfacePreset, defaults.surfacePreset),
    radius: RADIUS_VALUES.find(radius => radius === source.radius) ?? defaults.radius,
    density: pickEnum(ThemeDensity, source.density, defaults.density),
    cardStyle: pickEnum(CardStyle, source.cardStyle, defaults.cardStyle),
    shadowProfile: pickEnum(ShadowProfile, source.shadowProfile, defaults.shadowProfile),
    interactiveStyle: pickEnum(InteractiveStyle, source.interactiveStyle, defaults.interactiveStyle),
  }
}
