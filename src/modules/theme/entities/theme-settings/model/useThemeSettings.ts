import { useStorage } from '@vueuse/core'
import { DEFAULT_THEME_SETTINGS, sanitizeThemeSettings, type ThemeSettings } from './themeSettings'

const STORAGE_KEY = 'ui-builder-theme-settings'

// One shared state: the dialog edits it and the app's theme follows it.
const settings = useStorage<ThemeSettings>(STORAGE_KEY, DEFAULT_THEME_SETTINGS, undefined, {
  mergeDefaults: false,
  // Each tab shows the theme of its own project, so another tab's change must not arrive here.
  listenToStorageChanges: false,
  serializer: {
    read: text => sanitizeThemeSettings(JSON.parse(text)),
    write: value => JSON.stringify(value),
  },
})

export function useThemeSettings() {
  const resetSettings = () => {
    settings.value = { ...DEFAULT_THEME_SETTINGS }
  }
  const isCustomized = () => JSON.stringify(settings.value) !== JSON.stringify(DEFAULT_THEME_SETTINGS)
  return { settings, resetSettings, isCustomized }
}
