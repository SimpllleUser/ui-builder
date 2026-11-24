import { ThemeVariant } from './enums'
import { buildRadiusCss } from './radiusCss'
import { resolveThemeColors } from './themeColors'
import type { ThemeSettings } from './themeSettings'
import { buildVuetifyDefaults } from './vuetifyDefaults'
import { toObjectLiteral } from '../../../../../shared/lib/objectLiteral'

/** The `vuetify.ts` file that gives another app this theme. */
export function generateVuetifyConfig(settings: ThemeSettings): string {
  const themes = Object.fromEntries(
    Object.values(ThemeVariant).map(variant => [variant, { colors: resolveThemeColors(settings, variant) }]),
  )
  const options: Record<string, unknown> = { theme: { defaultTheme: settings.mode, themes } }
  const defaults = buildVuetifyDefaults(settings)
  if (Object.keys(defaults).length) options.defaults = defaults
  return `import { createVuetify } from 'vuetify'\n\nexport default createVuetify(${toObjectLiteral(options)})\n`
}

/** The style rules for a global stylesheet; empty when the settings need none. */
export const generateThemeCss = (settings: ThemeSettings) => buildRadiusCss(settings.radius)
