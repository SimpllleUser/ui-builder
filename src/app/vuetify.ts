import { createVuetify } from 'vuetify'
import {
  BASE_THEME_COLORS,
  PROJECT_THEME_NAMES,
  ThemeMode,
  ThemeVariant,
} from '../modules/theme/entities/theme-settings'

// The colours live with the theme settings, which change them while the app runs.
export default createVuetify({
  theme: {
    defaultTheme: ThemeMode.System,
    themes: {
      [ThemeVariant.Light]: { colors: { ...BASE_THEME_COLORS[ThemeVariant.Light] } },
      [ThemeVariant.Dark]: { colors: { ...BASE_THEME_COLORS[ThemeVariant.Dark] } },
      // The page being built has themes of its own, so the project's colours do not reach the editor.
      [PROJECT_THEME_NAMES[ThemeVariant.Light]]: {
        dark: false,
        colors: { ...BASE_THEME_COLORS[ThemeVariant.Light] },
      },
      [PROJECT_THEME_NAMES[ThemeVariant.Dark]]: { dark: true, colors: { ...BASE_THEME_COLORS[ThemeVariant.Dark] } },
    },
  },
})
