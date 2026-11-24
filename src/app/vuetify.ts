import { createVuetify } from 'vuetify'
import { BASE_THEME_COLORS, ThemeMode, ThemeVariant } from '../modules/theme/entities/theme-settings'

// The colours live with the theme settings, which change them while the app runs.
export default createVuetify({
  theme: {
    defaultTheme: ThemeMode.System,
    themes: {
      [ThemeVariant.Light]: { colors: { ...BASE_THEME_COLORS[ThemeVariant.Light] } },
      [ThemeVariant.Dark]: { colors: { ...BASE_THEME_COLORS[ThemeVariant.Dark] } },
    },
  },
})
