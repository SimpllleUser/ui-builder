import { CardStyle, InteractiveStyle, ThemeDensity } from './enums'
import { VUETIFY_DENSITY } from './presets'
import type { ThemeSettings } from './themeSettings'

export type ComponentDefaults = Record<string, Record<string, string | number | boolean>>

const DENSE_COMPONENTS = ['VBtn', 'VTextField', 'VSelect', 'VTextarea', 'VDataTable', 'VList']
const MODERN_BUTTON_CLASS = 'text-none'

/**
 * Vuetify's per-component defaults for the settings. A setting left at its default adds nothing,
 * so an untouched theme returns an empty object and the components keep Vuetify's own look.
 */
export function buildVuetifyDefaults(settings: ThemeSettings): ComponentDefaults {
  const defaults: ComponentDefaults = {}
  const add = (component: string, props: Record<string, string | number | boolean>) => {
    defaults[component] = { ...defaults[component], ...props }
  }

  if (settings.density !== ThemeDensity.Default) {
    for (const component of DENSE_COMPONENTS) add(component, { density: VUETIFY_DENSITY[settings.density] })
  }
  if (settings.cardStyle === CardStyle.Outlined) add('VCard', { variant: 'outlined' })
  if (settings.interactiveStyle === InteractiveStyle.Modern) {
    add('global', { ripple: false })
    add('VBtn', { variant: 'flat', class: MODERN_BUTTON_CLASS })
  }
  return defaults
}
