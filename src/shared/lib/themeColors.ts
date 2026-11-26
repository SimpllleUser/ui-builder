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

const THEME_VARIABLE = /^rgb\(\s*var\(--v-theme-([a-z0-9-]+)\)\s*\)$/
/** How a project's own colour is named where a style value is typed, such as by an agent: `theme-cobalt`. */
const OWN_COLOR_NAME = /^theme-([a-z][a-z0-9-]*)$/

/**
 * The style value for a theme colour. It refers to the theme's variable instead of a fixed colour,
 * so the element follows the theme (for example in dark mode) like Vuetify's own components do.
 */
export const themeColorValue = (color: string) => `rgb(var(--v-theme-${color}))`

/**
 * The theme colour a style value stands for, or null when it is none. `own` are the names of the project's own
 * colours, which count too.
 */
export function parseThemeColor(value: string | undefined, own: readonly string[] = []): string | null {
  const name = value ? THEME_VARIABLE.exec(value.trim())?.[1] : undefined
  return [...THEME_COLORS, ...own].find(color => color === name) ?? null
}

/** A theme colour name (`primary`, or `theme-cobalt` for the project's own) as its style value, else null. */
export const themeColorFromName = (name: string): string | null => {
  const color = THEME_COLORS.find(item => item === name.trim()) ?? OWN_COLOR_NAME.exec(name.trim())?.[1]
  return color ? themeColorValue(color) : null
}
