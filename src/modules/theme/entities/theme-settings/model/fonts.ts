import { FontFamily } from './enums'

export type BundledFont = Exclude<FontFamily, FontFamily.Default>

export interface Font {
  label: string
  /** The CSS `font-family` value, with fallbacks. */
  stack: string
  /** The npm package that holds the font files. */
  packageName: string
}

const SANS = 'system-ui, sans-serif'
const SERIF = 'Georgia, serif'

const font = (label: string, slug: string, fallback = SANS): Font => ({
  label,
  stack: `'${label} Variable', ${fallback}`,
  packageName: `@fontsource-variable/${slug}`,
})

export const FONTS: Record<BundledFont, Font> = {
  [FontFamily.Inter]: font('Inter', 'inter'),
  [FontFamily.Manrope]: font('Manrope', 'manrope'),
  [FontFamily.Onest]: font('Onest', 'onest'),
  [FontFamily.Montserrat]: font('Montserrat', 'montserrat'),
  [FontFamily.Rubik]: font('Rubik', 'rubik'),
  [FontFamily.Nunito]: font('Nunito', 'nunito'),
  [FontFamily.Unbounded]: font('Unbounded', 'unbounded'),
  [FontFamily.SourceSerif]: font('Source Serif 4', 'source-serif-4', SERIF),
  [FontFamily.PlayfairDisplay]: font('Playfair Display', 'playfair-display', SERIF),
  [FontFamily.JetBrainsMono]: font('JetBrains Mono', 'jetbrains-mono', 'ui-monospace, monospace'),
}
