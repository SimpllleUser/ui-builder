import { ThemeVariant } from './enums'
import { EXPORTED_PAGE_SCOPE } from './pageScope'
import { buildPageCss, buildThemeCss } from './themeCss'
import { resolveThemeColors } from './themeColors'
import type { ThemeSettings } from './themeSettings'
import { buildFontImports } from './typographyCss'
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
// `@import` is only valid before the first rule, so the fonts come first.
export const generateThemeCss = (settings: ThemeSettings) =>
  [buildFontImports(settings), buildThemeCss(settings), buildPageCss(settings, EXPORTED_PAGE_SCOPE)]
    .filter(Boolean)
    .join('\n')
