// Public API of this slice: everything outside it imports from here, never from the files inside.
export {
  CardStyle,
  ColorPreset,
  DesignPreset,
  FieldStyle,
  FontFamily,
  SpacingScale,
  TypographyStyle,
  InteractiveStyle,
  SemanticPreset,
  ShadowProfile,
  SurfacePreset,
  ThemeDensity,
  ThemeMode,
  ThemeVariant,
} from './model/enums'
export {
  BRAND_COLORS,
  RADIUS_VALUES,
  SEMANTIC_COLORS,
  isBrandPreset,
  isSemanticColorPreset,
  type BrandPreset,
  type SemanticColorPreset,
} from './model/presets'
export { generateThemeCss, generateVuetifyConfig } from './model/exportConfig'
export { sanitizeThemeSettings, DEFAULT_THEME_SETTINGS, type ThemeSettings } from './model/themeSettings'
export { DESIGN_PRESETS, applyDesignPreset, matchingDesignPreset } from './model/designPresets'
export { extraColorNameError, MAX_EXTRA_COLORS } from './model/extraColors'
export { applyThemePatch, DESIGN_PRESET_NAMES, THEME_CHOICES } from './model/themePatch'
export { FONTS } from './model/fonts'
export { resolveFonts } from './model/typographyCss'
export { buildVuetifyDefaults } from './model/vuetifyDefaults'
export { resolveThemeColors } from './model/themeColors'
export { BASE_THEME_COLORS } from './model/baseTheme'
export { useApplyTheme } from './model/useApplyTheme'
export { useEditorAppearance } from './model/useEditorAppearance'
export { useProjectThemeVariant } from './model/useProjectThemeVariant'
export { PROJECT_THEME_NAMES } from './model/pageScope'
export { useThemeSettings } from './model/useThemeSettings'
export { default as ThemeDefaultsProvider } from './ui/ThemeDefaultsProvider.vue'
