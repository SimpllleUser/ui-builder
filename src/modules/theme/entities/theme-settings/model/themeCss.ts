import { buildCardCss } from './cardCss'
import { buildFieldCss } from './fieldCss'
import { buildRadiusCss } from './radiusCss'
import { buildShadowCss } from './shadowCss'
import { buildSpacingCss } from './spacingCss'
import type { ThemeSettings } from './themeSettings'
import { buildTokenCss } from './tokenCss'
import { buildTypographyCss } from './typographyCss'

/** Rules for the whole app: token variables, corners and shadows. Empty when there are none. */
export const buildThemeCss = (settings: ThemeSettings) =>
  [buildTokenCss(settings), buildRadiusCss(settings.radius), buildShadowCss(settings.shadowProfile)]
    .filter(Boolean)
    .join('\n')

/** Rules for the page being built only: type, spacing, cards and fields inside `scope`. Empty when there are none. */
export const buildPageCss = (settings: ThemeSettings, scope: string) =>
  [
    buildTypographyCss(settings, scope),
    buildSpacingCss(settings.spacing, scope),
    buildCardCss(settings.cardStyle, scope),
    buildFieldCss(settings.fieldStyle, scope),
  ]
    .filter(Boolean)
    .join('\n')
