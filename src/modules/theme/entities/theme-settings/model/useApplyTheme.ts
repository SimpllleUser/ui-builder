import { computed, watch } from 'vue'
import { useStyleTag } from '@vueuse/core'
import { useTheme } from 'vuetify'
import { ThemeVariant } from './enums'
import { PAGE_SCOPE_CLASS } from './pageScope'
import { buildPageCss, buildThemeCss } from './themeCss'
import { resolveThemeColors } from './themeColors'
import { useThemeSettings } from './useThemeSettings'

/**
 * Makes the app follow the theme settings. Call it once, in the root component.
 */
export function useApplyTheme() {
  const theme = useTheme()
  const { settings } = useThemeSettings()

  /** Names of the project's own colours the theme holds now, so those removed since are taken out. */
  let ownColors: string[] = []
  watch(
    settings,
    current => {
      theme.global.name.value = current.mode
      for (const variant of Object.values(ThemeVariant)) {
        const { colors } = theme.themes.value[variant]
        for (const name of ownColors) {
          delete colors[name]
          delete colors[`on-${name}`]
        }
        theme.themes.value[variant].colors = { ...colors, ...resolveThemeColors(current, variant) }
      }
      ownColors = Object.keys(current.extraColors)
    },
    { immediate: true, deep: true },
  )

  useStyleTag(
    computed(() => `${buildThemeCss(settings.value)}\n${buildPageCss(settings.value, `.${PAGE_SCOPE_CLASS}`)}`),
    { id: 'ui-builder-theme-css' },
  )
}
