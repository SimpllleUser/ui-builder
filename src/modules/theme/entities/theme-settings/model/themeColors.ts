import { BASE_THEME_COLORS, type ThemeColorMap } from './baseTheme'
import { ColorPreset, SemanticPreset, SurfacePreset, ThemeVariant } from './enums'
import { BRAND_COLORS, SEMANTIC_COLORS, SURFACE_COLORS, type BrandColors } from './presets'
import type { ThemeSettings } from './themeSettings'
import { readableTextColor } from '../../../../../shared/lib/hexColor'

/** A colour together with the text colour that reads well on it, as Vuetify's `on-` colours expect. */
const withText = (name: string, color: string): ThemeColorMap => ({
  [name]: color,
  [`on-${name}`]: readableTextColor(color),
})

function brandColors(settings: ThemeSettings): BrandColors | null {
  if (settings.colorPreset === ColorPreset.Default) return null
  if (settings.colorPreset === ColorPreset.Custom) {
    return { primary: settings.customPrimary, secondary: settings.customSecondary }
  }
  return BRAND_COLORS[settings.colorPreset]
}

/** Only the colours the settings change; everything else stays as the app ships it. */
export function colorOverrides(settings: ThemeSettings, variant: ThemeVariant): ThemeColorMap {
  const brand = brandColors(settings)
  const semantic = settings.semanticPreset === SemanticPreset.Default ? null : SEMANTIC_COLORS[settings.semanticPreset]
  const surface =
    settings.surfacePreset === SurfacePreset.Default ? null : SURFACE_COLORS[settings.surfacePreset][variant]
  return {
    ...(brand && { ...withText('primary', brand.primary), ...withText('secondary', brand.secondary) }),
    ...(semantic && Object.assign({}, ...Object.entries(semantic).map(([name, color]) => withText(name, color)))),
    ...surface,
  }
}

/** Every colour of one theme variant with the settings applied. */
export const resolveThemeColors = (settings: ThemeSettings, variant: ThemeVariant): ThemeColorMap => ({
  ...BASE_THEME_COLORS[variant],
  ...colorOverrides(settings, variant),
})
