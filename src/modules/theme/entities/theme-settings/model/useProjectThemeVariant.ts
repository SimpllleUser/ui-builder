import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { ThemeMode, ThemeVariant } from './enums'
import { PROJECT_THEME_NAMES } from './pageScope'
import { useThemeSettings } from './useThemeSettings'

/** Which of the project's two colour sets the page shows now, and the Vuetify theme that holds it. */
export function useProjectThemeVariant() {
  const { settings } = useThemeSettings()
  const systemIsDark = useMediaQuery('(prefers-color-scheme: dark)')
  const variant = computed(() => {
    const { mode } = settings.value
    const dark = mode === ThemeMode.Dark || (mode === ThemeMode.System && systemIsDark.value)
    return dark ? ThemeVariant.Dark : ThemeVariant.Light
  })
  const themeName = computed(() => PROJECT_THEME_NAMES[variant.value])
  return { variant, themeName }
}
