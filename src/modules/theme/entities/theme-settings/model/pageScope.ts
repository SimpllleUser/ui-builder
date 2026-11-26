import { ThemeVariant } from './enums'

/** Wraps the page being built, so its type and spacing do not restyle the editor around it. */
export const PAGE_SCOPE_CLASS = 'ui-page-style'

/** In an exported app the page is the whole app, including dialogs and menus, which live outside it. */
export const EXPORTED_PAGE_SCOPE = ':is(.v-application, .v-overlay-container)'

/** Vuetify themes that hold the project's colours. The editor keeps `light` and `dark` for itself. */
export const PROJECT_THEME_NAMES: Record<ThemeVariant, string> = {
  [ThemeVariant.Light]: 'project-light',
  [ThemeVariant.Dark]: 'project-dark',
}

/** The page being edited or previewed, with its dialogs and menus, which carry the theme's class outside it. */
export const PAGE_THEME_SCOPE = `:is(.${[PAGE_SCOPE_CLASS, ...Object.values(PROJECT_THEME_NAMES).map(name => `v-theme--${name}`)].join(', .')})`
