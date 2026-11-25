/** The CSS variables that styles using a spacing, radius or text token refer to. */
import {
  DEFAULT_TEXT_VALUES,
  radiusVariable,
  RadiusToken,
  spaceVariable,
  SpaceToken,
  TEXT_PARTS,
  TextToken,
  textVariable,
  type TextValues,
} from '../../../../../shared/lib/themeTokens'
import { FontFamily, SpacingScale, TypographyStyle } from './enums'
import type { ThemeSettings } from './themeSettings'
import { resolveFonts, TYPE_TOKENS } from './typographyCss'

/** Pixels per spacing token; `md` is the inner padding of a card in that scale. */
const SPACE_SCALES: Record<Exclude<SpacingScale, SpacingScale.Default>, Record<SpaceToken, number>> = {
  [SpacingScale.Tight]: { xs: 4, sm: 8, md: 14, lg: 20, xl: 28, '2xl': 40 },
  [SpacingScale.Balanced]: { xs: 6, sm: 12, md: 20, lg: 28, xl: 40, '2xl': 56 },
  [SpacingScale.Airy]: { xs: 8, sm: 16, md: 28, lg: 40, xl: 56, '2xl': 80 },
}

const RADIUS_FACTORS = [
  { token: RadiusToken.Sm, factor: 0.5 },
  { token: RadiusToken.Md, factor: 1 },
  { token: RadiusToken.Lg, factor: 2 },
]

const HEADING_TOKENS = [TextToken.H1, TextToken.H2, TextToken.H3, TextToken.H4, TextToken.H5, TextToken.H6]
const HEADING_LINE_HEIGHT = '1.15'
const CAPTION_SIZE = '0.8125rem'

function spaceVariables({ spacing }: ThemeSettings): string[] {
  if (spacing === SpacingScale.Default) return []
  return Object.values(SpaceToken).map(token => `${spaceVariable(token)}: ${SPACE_SCALES[spacing][token]}px;`)
}

/** The chosen radius is the middle one; smaller and larger corners keep their proportion to it. */
function radiusVariables({ radius }: ThemeSettings): string[] {
  if (radius === null) return []
  return RADIUS_FACTORS.map(({ token, factor }) => `${radiusVariable(token)}: ${radius * factor}px;`)
}

function textStyle(settings: ThemeSettings, token: TextToken): Partial<TextValues> {
  const { heading, body } = resolveFonts(settings)
  const tokens = settings.typography === TypographyStyle.Default ? null : TYPE_TOKENS[settings.typography]
  const level = HEADING_TOKENS.indexOf(token)
  const isHeading = level >= 0
  const font = isHeading ? heading : body
  const scale: Partial<TextValues> = !tokens
    ? {}
    : isHeading
      ? {
          size: tokens.headingSizes[level],
          line: HEADING_LINE_HEIGHT,
          weight: String(tokens.headingWeight),
          tracking: tokens.headingTracking,
        }
      : {
          size: token === TextToken.Caption ? CAPTION_SIZE : tokens.bodySize,
          line: String(tokens.bodyLineHeight),
          weight: DEFAULT_TEXT_VALUES[token].weight,
          tracking: '0',
        }
  return { ...scale, ...(font ? { font: font.stack } : {}) }
}

const hasTextChanges = ({ typography, headingFont, bodyFont }: ThemeSettings) =>
  typography !== TypographyStyle.Default || headingFont !== FontFamily.Default || bodyFont !== FontFamily.Default

function textVariables(settings: ThemeSettings): string[] {
  if (!hasTextChanges(settings)) return []
  return Object.values(TextToken).flatMap(token => {
    const values = textStyle(settings, token)
    return TEXT_PARTS.flatMap(part => (values[part] ? [`${textVariable(token, part)}: ${values[part]};`] : []))
  })
}

/** Only what differs from the defaults every reference carries; empty when nothing does. */
export function buildTokenCss(settings: ThemeSettings): string {
  const variables = [...spaceVariables(settings), ...radiusVariables(settings), ...textVariables(settings)]
  return variables.length ? `:root {\n${variables.map(line => `  ${line}`).join('\n')}\n}\n` : ''
}
