import { computed, watch } from 'vue'
import { useStyleTag } from '@vueuse/core'
import { useTheme } from 'vuetify'
import { resolveEditorColors } from './editorAppearance'
import { ThemeVariant } from './enums'
import { PAGE_SCOPE_CLASS, PAGE_THEME_SCOPE, PROJECT_THEME_NAMES } from './pageScope'
import { buildPageCss, buildScopedThemeCss } from './themeCss'
import { resolveThemeColors } from './themeColors'
import { useEditorAppearance } from './useEditorAppearance'
import { useThemeSettings } from './useThemeSettings'

/**
 * Makes the editor follow its own appearance and the page being built follow the project's theme.
 * Call it once, in the root component.
 */
export function useApplyTheme() {
  const theme = useTheme()
  const { settings } = useThemeSettings()
  const { appearance } = useEditorAppearance()

  const setColors = (name: string, colors: Record<string, string>, removed: string[] = []) => {
    const next = { ...theme.themes.value[name].colors }
    for (const color of removed) {
      delete next[color]
      delete next[`on-${color}`]
    }
    theme.themes.value[name].colors = { ...next, ...colors }
  }

  watch(
    appearance,
    current => {
      theme.global.name.value = current.mode
      for (const variant of Object.values(ThemeVariant)) setColors(variant, resolveEditorColors(current, variant))
    },
    { immediate: true, deep: true },
  )

  /** Names of the project's own colours the theme holds now, so those removed since are taken out. */
  let ownColors: string[] = []
  watch(
    settings,
    current => {
      for (const variant of Object.values(ThemeVariant)) {
        setColors(PROJECT_THEME_NAMES[variant], resolveThemeColors(current, variant), ownColors)
      }
      ownColors = Object.keys(current.extraColors)
    },
    { immediate: true, deep: true },
  )

  useStyleTag(
    computed(
      () =>
        `${buildScopedThemeCss(settings.value, PAGE_THEME_SCOPE)}\n${buildPageCss(settings.value, `.${PAGE_SCOPE_CLASS}`)}`,
    ),
    { id: 'ui-builder-theme-css' },
  )
}
