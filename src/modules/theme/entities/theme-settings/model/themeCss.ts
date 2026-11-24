import { buildRadiusCss } from './radiusCss'
import { buildShadowCss } from './shadowCss'
import type { ThemeSettings } from './themeSettings'

/** Every style rule the settings need beyond colours and component defaults; empty when there are none. */
export const buildThemeCss = (settings: ThemeSettings) =>
  [buildRadiusCss(settings.radius), buildShadowCss(settings.shadowProfile)].filter(Boolean).join('\n')
