import { computed, watch } from 'vue'
import { useStyleTag } from '@vueuse/core'
import { useTheme } from 'vuetify'
import { ThemeVariant } from './enums'
import { buildThemeCss } from './themeCss'
import { resolveThemeColors } from './themeColors'
import { useThemeSettings } from './useThemeSettings'

/**
 * Makes the app follow the theme settings. Call it once, in the root component.
 */
export function useApplyTheme() {
  const theme = useTheme()
  const { settings } = useThemeSettings()

  watch(
    settings,
    current => {
      theme.global.name.value = current.mode
      for (const variant of Object.values(ThemeVariant)) {
        theme.themes.value[variant].colors = {
          ...theme.themes.value[variant].colors,
          ...resolveThemeColors(current, variant),
        }
      }
    },
    { immediate: true, deep: true },
  )

  useStyleTag(
    computed(() => buildThemeCss(settings.value)),
    { id: 'ui-builder-theme-css' },
  )
}
