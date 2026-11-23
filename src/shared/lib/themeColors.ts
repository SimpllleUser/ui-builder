/** The colours of the app's theme that the design controls offer as presets. The values are theme colour names. */
export enum ThemeColor {
  Primary = 'primary',
  Secondary = 'secondary',
  Accent = 'accent',
  Success = 'success',
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Surface = 'surface',
  Background = 'background',
  OnSurface = 'on-surface',
}

export const THEME_COLORS = Object.values(ThemeColor)

const THEME_VARIABLE = /^rgb\(\s*var\(--v-theme-([a-z-]+)\)\s*\)$/

/**
 * The style value for a theme colour. It refers to the theme's variable instead of a fixed colour,
 * so the element follows the theme (for example in dark mode) like Vuetify's own components do.
 */
export const themeColorValue = (color: ThemeColor) => `rgb(var(--v-theme-${color}))`

/** The theme colour a style value stands for, or null when it is a custom colour. */
export function parseThemeColor(value: string | undefined): ThemeColor | null {
  const name = value ? THEME_VARIABLE.exec(value.trim())?.[1] : undefined
  return THEME_COLORS.find(color => color === name) ?? null
}

/** A theme colour name (`primary`) as its style value; anything else is not a theme colour. */
export const themeColorFromName = (name: string): string | null => {
  const color = THEME_COLORS.find(item => item === name.trim())
  return color ? themeColorValue(color) : null
}
