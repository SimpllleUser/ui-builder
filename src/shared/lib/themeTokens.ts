/**
 * The theme's spacing, corner radius and text styles that the design controls offer as presets. A style refers to
 * the theme's CSS variable, so the element follows the theme like it does with theme colours. Each reference carries
 * the default value, for a theme that changes nothing and for code used without the theme's styles.
 */
export enum SpaceToken {
  Xs = 'xs',
  Sm = 'sm',
  Md = 'md',
  Lg = 'lg',
  Xl = 'xl',
  Xxl = '2xl',
}

export enum RadiusToken {
  Sm = 'sm',
  Md = 'md',
  Lg = 'lg',
  Full = 'full',
}

export enum TextToken {
  H1 = 'h1',
  H2 = 'h2',
  H3 = 'h3',
  H4 = 'h4',
  H5 = 'h5',
  H6 = 'h6',
  Body = 'body',
  Caption = 'caption',
}

export interface TextValues {
  size: string
  line: string
  weight: string
  tracking: string
  font: string
}

export const DEFAULT_SPACE_PX: Record<SpaceToken, number> = {
  [SpaceToken.Xs]: 4,
  [SpaceToken.Sm]: 8,
  [SpaceToken.Md]: 16,
  [SpaceToken.Lg]: 24,
  [SpaceToken.Xl]: 32,
  [SpaceToken.Xxl]: 48,
}

export const DEFAULT_RADIUS_PX: Record<RadiusToken, number> = {
  [RadiusToken.Sm]: 2,
  [RadiusToken.Md]: 4,
  [RadiusToken.Lg]: 8,
  [RadiusToken.Full]: 9999,
}

const textValues = (size: string, line: string, weight: string, tracking: string): TextValues => ({
  size,
  line,
  weight,
  tracking,
  font: 'inherit',
})

/** Vuetify's own type scale. */
export const DEFAULT_TEXT_VALUES: Record<TextToken, TextValues> = {
  [TextToken.H1]: textValues('6rem', '1', '300', '-0.015625em'),
  [TextToken.H2]: textValues('3.75rem', '1.2', '300', '-0.0083em'),
  [TextToken.H3]: textValues('3rem', '1.05', '400', '0'),
  [TextToken.H4]: textValues('2.125rem', '1.175', '400', '0.0074em'),
  [TextToken.H5]: textValues('1.5rem', '1.333', '400', '0'),
  [TextToken.H6]: textValues('1.25rem', '1.6', '500', '0.0125em'),
  [TextToken.Body]: textValues('1rem', '1.5', '400', '0.031em'),
  [TextToken.Caption]: textValues('0.75rem', '1.667', '400', '0.033em'),
}

export const spaceVariable = (token: SpaceToken) => `--ub-space-${token}`
export const radiusVariable = (token: RadiusToken) => `--ub-radius-${token}`
export const textVariable = (token: TextToken, part: keyof TextValues) => `--ub-text-${token}-${part}`

const reference = (variable: string, fallback: string) => `var(${variable}, ${fallback})`

export const spaceValue = (token: SpaceToken) => reference(spaceVariable(token), `${DEFAULT_SPACE_PX[token]}px`)
export const radiusValue = (token: RadiusToken) => reference(radiusVariable(token), `${DEFAULT_RADIUS_PX[token]}px`)

/** The style properties a text style sets. */
const TEXT_PROPERTIES: { part: keyof TextValues; property: string }[] = [
  { part: 'size', property: 'fontSize' },
  { part: 'line', property: 'lineHeight' },
  { part: 'weight', property: 'fontWeight' },
  { part: 'tracking', property: 'letterSpacing' },
  { part: 'font', property: 'fontFamily' },
]

export const TEXT_PARTS = TEXT_PROPERTIES.map(({ part }) => part)

/** The style of a whole text style, or, for null, the patch that removes one. */
export function textStylePatch(token: TextToken | null): Record<string, string | null> {
  return Object.fromEntries(
    TEXT_PROPERTIES.map(({ part, property }) => [
      property,
      token && reference(textVariable(token, part), DEFAULT_TEXT_VALUES[token][part]),
    ]),
  )
}

/** The token whose variable a style value refers to, or null for any other value. */
function parseToken<T extends string>(
  tokens: T[],
  value: string | undefined,
  variable: (token: T) => string,
): T | null {
  const trimmed = value?.trim() ?? ''
  return tokens.find(token => trimmed.startsWith(`var(${variable(token)},`)) ?? null
}

export const parseSpaceToken = (value: string | undefined) =>
  parseToken(Object.values(SpaceToken), value, spaceVariable)
export const parseRadiusToken = (value: string | undefined) =>
  parseToken(Object.values(RadiusToken), value, radiusVariable)
export const parseTextToken = (fontSize: string | undefined) =>
  parseToken(Object.values(TextToken), fontSize, token => textVariable(token, 'size'))

/** `space-md` and `radius-lg` as style values; anything else is not a token name. */
export function tokenFromName(name: string): string | null {
  const trimmed = name.trim()
  const space = Object.values(SpaceToken).find(token => trimmed === `space-${token}`)
  if (space) return spaceValue(space)
  const radius = Object.values(RadiusToken).find(token => trimmed === `radius-${token}`)
  return radius ? radiusValue(radius) : null
}
