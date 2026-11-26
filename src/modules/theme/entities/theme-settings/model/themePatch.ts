/**
 * A change to the theme described from outside, such as by an agent. Unlike settings read from storage,
 * where a wrong value falls back to its default, a wrong name or value here is refused with what is allowed.
 */
import { applyDesignPreset } from './designPresets'
import { MAX_EXTRA_COLORS, patchExtraColors } from './extraColors'
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
  ThemeMode,
  TypographyStyle,
} from './enums'
import { RADIUS_VALUES } from './presets'
import { sanitizeThemeSettings, type ThemeSettings } from './themeSettings'

const HEX_HINT = 'a hex colour such as "#2196F3"'

/** What each setting accepts. */
export const THEME_CHOICES: Record<keyof ThemeSettings, readonly unknown[] | string> = {
  mode: Object.values(ThemeMode),
  colorPreset: Object.values(ColorPreset),
  customPrimary: HEX_HINT,
  customSecondary: HEX_HINT,
  extraColors: `up to ${MAX_EXTRA_COLORS} colours of your own as { name: hex }; null removes one`,
  semanticPreset: Object.values(SemanticPreset),
  surfacePreset: Object.values(SurfacePreset),
  radius: RADIUS_VALUES,
  density: Object.values(ThemeDensity),
  cardStyle: Object.values(CardStyle),
  shadowProfile: Object.values(ShadowProfile),
  interactiveStyle: Object.values(InteractiveStyle),
  typography: Object.values(TypographyStyle),
  spacing: Object.values(SpacingScale),
  fieldStyle: Object.values(FieldStyle),
  headingFont: Object.values(FontFamily),
  bodyFont: Object.values(FontFamily),
}

export const DESIGN_PRESET_NAMES = Object.values(DesignPreset)

const isSetting = (name: string): name is keyof ThemeSettings => Object.hasOwn(THEME_CHOICES, name)

const describeChoices = (choices: readonly unknown[] | string) =>
  typeof choices === 'string' ? choices : choices.map(choice => JSON.stringify(choice)).join(', ')

/**
 * The settings with `patch` applied. `preset` sets a whole look first, and the other entries change it.
 * A custom colour given without a colour preset also switches to the custom colours.
 * `extraColors` adds to the project's own colours, and removes those given as null.
 * Throws for a setting or value the theme does not have, changing nothing.
 */
export function applyThemePatch(settings: ThemeSettings, patch: Record<string, unknown>): ThemeSettings {
  const { preset, extraColors, ...changes } = patch
  const look = DESIGN_PRESET_NAMES.find(name => name === preset)
  if (preset !== undefined && !look)
    throw new Error(`Unknown design preset “${String(preset)}”. Use one of: ${describeChoices(DESIGN_PRESET_NAMES)}.`)

  const usesCustomColour = 'customPrimary' in changes || 'customSecondary' in changes
  const asked: Record<string, unknown> = {
    ...(usesCustomColour ? { colorPreset: ColorPreset.Custom } : {}),
    ...changes,
  }
  const looked = look ? applyDesignPreset(settings, look) : settings
  const base =
    extraColors === undefined ? looked : { ...looked, extraColors: patchExtraColors(looked.extraColors, extraColors) }
  const next = sanitizeThemeSettings({ ...base, ...asked })
  for (const [name, value] of Object.entries(asked)) {
    if (!isSetting(name))
      throw new Error(`Unknown theme setting “${name}”. Settings: ${Object.keys(THEME_CHOICES).join(', ')}.`)
    if (next[name] !== value)
      throw new Error(`Invalid ${name}: ${JSON.stringify(value)}. Use ${describeChoices(THEME_CHOICES[name])}.`)
  }
  return next
}
