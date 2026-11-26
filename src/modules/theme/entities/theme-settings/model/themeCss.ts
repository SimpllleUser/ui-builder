import { buildCardCss } from './cardCss'
import { buildFieldCss } from './fieldCss'
import { buildRadiusCss } from './radiusCss'
import { buildShadowCss } from './shadowCss'
import { buildSpacingCss } from './spacingCss'
import type { ThemeSettings } from './themeSettings'
import { buildTokenCss } from './tokenCss'
import { buildTypographyCss } from './typographyCss'

const buildSurfaceCss = ({ radius, shadowProfile }: ThemeSettings) =>
  [buildRadiusCss(radius), buildShadowCss(shadowProfile)].filter(Boolean).join('\n')

/** Token variables, corners and shadows for a whole exported app. Empty when there are none. */
export const buildThemeCss = (settings: ThemeSettings) =>
  [buildTokenCss(settings), buildSurfaceCss(settings)].filter(Boolean).join('\n')

/** The same rules kept inside `scope`, so they style the project's page and leave the editor alone. */
export function buildScopedThemeCss(settings: ThemeSettings, scope: string): string {
  const surface = buildSurfaceCss(settings)
  return [buildTokenCss(settings, scope), surface && `${scope} {\n${surface}}\n`].filter(Boolean).join('\n')
}

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
