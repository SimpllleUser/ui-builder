import { FontFamily, TypographyStyle } from './enums'
import { FONTS, type BundledFont } from './fonts'
import type { ThemeSettings } from './themeSettings'

type StyledTypography = Exclude<TypographyStyle, TypographyStyle.Default>

interface TypeTokens {
  headingFont: BundledFont
  bodyFont: BundledFont
  headingWeight: number
  headingTracking: string
  bodySize: string
  bodyLineHeight: number
  /** Sizes of h1 to h6; large ones shrink with the window. */
  headingSizes: [string, string, string, string, string, string]
}

export const TYPE_TOKENS: Record<StyledTypography, TypeTokens> = {
  [TypographyStyle.Modern]: {
    headingFont: FontFamily.Inter,
    bodyFont: FontFamily.Inter,
    headingWeight: 650,
    headingTracking: '-0.022em',
    bodySize: '0.9375rem',
    bodyLineHeight: 1.6,
    headingSizes: ['clamp(2.5rem, 6vw, 4rem)', 'clamp(2rem, 5vw, 3rem)', '2.25rem', '1.75rem', '1.375rem', '1.0625rem'],
  },
  [TypographyStyle.Friendly]: {
    headingFont: FontFamily.Manrope,
    bodyFont: FontFamily.Manrope,
    headingWeight: 700,
    headingTracking: '-0.018em',
    bodySize: '0.9688rem',
    bodyLineHeight: 1.65,
    headingSizes: ['clamp(2.5rem, 6vw, 4rem)', 'clamp(2rem, 5vw, 3rem)', '2.25rem', '1.875rem', '1.5rem', '1.1875rem'],
  },
  [TypographyStyle.Editorial]: {
    headingFont: FontFamily.SourceSerif,
    bodyFont: FontFamily.Inter,
    headingWeight: 500,
    headingTracking: '-0.012em',
    bodySize: '1rem',
    bodyLineHeight: 1.7,
    headingSizes: [
      'clamp(3rem, 8vw, 5rem)',
      'clamp(2.5rem, 6vw, 3.75rem)',
      '2.875rem',
      '2.25rem',
      '1.75rem',
      '1.375rem',
    ],
  },
  [TypographyStyle.Bold]: {
    headingFont: FontFamily.Manrope,
    bodyFont: FontFamily.Inter,
    headingWeight: 800,
    headingTracking: '-0.035em',
    bodySize: '0.9688rem',
    bodyLineHeight: 1.55,
    headingSizes: ['clamp(3rem, 9vw, 5.5rem)', 'clamp(2.5rem, 7vw, 4rem)', '3rem', '2.25rem', '1.625rem', '1.25rem'],
  },
}

const isStyled = (style: TypographyStyle): style is StyledTypography => style in TYPE_TOKENS

type TypeSettings = Pick<ThemeSettings, 'typography' | 'headingFont' | 'bodyFont'>

/** The fonts in use: the user's pick, else the typography style's, else null for Vuetify's own. */
export function resolveFonts({ typography, headingFont, bodyFont }: TypeSettings) {
  const tokens = isStyled(typography) ? TYPE_TOKENS[typography] : null
  const resolve = (chosen: FontFamily, fromStyle: BundledFont | undefined) =>
    chosen === FontFamily.Default ? (fromStyle ? FONTS[fromStyle] : null) : FONTS[chosen]
  return { heading: resolve(headingFont, tokens?.headingFont), body: resolve(bodyFont, tokens?.bodyFont) }
}

/** The `@import` lines that give another app the fonts in use. */
export function buildFontImports(settings: TypeSettings): string {
  const { heading, body } = resolveFonts(settings)
  const packages = [heading, body].flatMap(font => (font ? [font.packageName] : []))
  return [...new Set(packages)].map(name => `@import '${name}';\n`).join('')
}

const headingSelectors = (scope: string, selectors: string[]) => selectors.map(name => `${scope} ${name}`).join(', ')

// Vuetify's `text-*` classes are `!important`, so the rules that override them must be too.
function headingFontRules(stack: string, scope: string) {
  const classes = [1, 2, 3, 4, 5, 6].map(level => `.text-h${level}`)
  return [
    `${headingSelectors(scope, classes)} { font-family: ${stack} !important; }`,
    `${headingSelectors(scope, ['h1', 'h2', 'h3', 'h4', '.v-card-title', '.v-toolbar-title'])} { font-family: ${stack}; }`,
  ]
}

function bodyFontRules(stack: string, scope: string) {
  const classes = [
    "[class*='text-body']",
    "[class*='text-subtitle']",
    '.text-caption',
    '.text-button',
    '.text-overline',
  ]
  return [
    `${scope} { font-family: ${stack}; }`,
    `${headingSelectors(scope, classes)} { font-family: ${stack} !important; }`,
  ]
}

/** Sizes, weights and spacing of letters; the font families are separate so they can be picked on their own. */
function typeScaleRules(tokens: TypeTokens, scope: string) {
  const heading = `font-weight: ${tokens.headingWeight} !important; letter-spacing: ${tokens.headingTracking} !important;`
  const body = `font-size: ${tokens.bodySize}; line-height: ${tokens.bodyLineHeight}; letter-spacing: 0;`
  const headings = tokens.headingSizes.map(
    (size, index) =>
      `${scope} .text-h${index + 1} { ${heading} font-size: ${size} !important; line-height: 1.15 !important; }`,
  )
  return [
    `${headingSelectors(scope, ["[class*='text-body']", "[class*='text-subtitle']", '.text-button', '.text-overline'])} { letter-spacing: 0 !important; }`,
    `${headingSelectors(scope, ['h1', 'h2', 'h3', 'h4'])} { font-weight: ${tokens.headingWeight}; letter-spacing: ${tokens.headingTracking}; }`,
    `${headingSelectors(scope, ['.v-card-title', '.v-toolbar-title'])} { font-weight: ${tokens.headingWeight}; font-size: ${tokens.headingSizes[5]}; letter-spacing: ${tokens.headingTracking}; line-height: 1.35; }`,
    ...headings,
    `${headingSelectors(scope, ['.v-card-text', '.v-card-subtitle', '.v-alert', '.v-list-item-title', '.v-table'])} { ${body} }`,
    // Capital letters and wide tracking are what date Material's controls the most.
    `${headingSelectors(scope, ['.v-btn', '.v-tab', '.v-chip'])} { font-weight: 600; letter-spacing: 0; text-transform: none; }`,
    `${scope} .v-table th { font-size: 0.8125rem !important; font-weight: 600 !important; color: rgba(var(--v-theme-on-surface), 0.6) !important; }`,
  ]
}

/** Type rules for everything inside `scope`; empty when neither a style nor a font is chosen. */
export function buildTypographyCss(settings: TypeSettings, scope: string): string {
  const { heading, body } = resolveFonts(settings)
  const rules = [
    ...(body ? bodyFontRules(body.stack, scope) : []),
    ...(heading ? headingFontRules(heading.stack, scope) : []),
    ...(isStyled(settings.typography) ? typeScaleRules(TYPE_TOKENS[settings.typography], scope) : []),
  ]
  return rules.map(rule => `${rule}\n`).join('')
}
