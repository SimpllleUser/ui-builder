/** Colours a project names itself, beside the brand, status and surface colours of the theme. */
import { isHexColor } from '../../../../../shared/lib/hexColor'
import { THEME_COLORS } from '../../../../../shared/lib/themeColors'

export type ExtraColors = Record<string, string>

export const MAX_EXTRA_COLORS = 8
const NAME = /^[a-z][a-z0-9-]{0,23}$/

/** Why a colour cannot be called this, or null when it can. */
export function extraColorNameError(name: string): string | null {
  if (!NAME.test(name)) return 'Use small Latin letters, digits and dashes, starting with a letter (up to 24).'
  if (THEME_COLORS.some(color => color === name) || name.startsWith('on-'))
    return `“${name}” is already a colour of the theme.`
  return null
}

/** The usable entries of a table from outside, up to the limit. */
export function sanitizeExtraColors(raw: unknown): ExtraColors {
  const entries = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? Object.entries(raw) : []
  return Object.fromEntries(
    entries
      .filter(
        (entry): entry is [string, string] =>
          !extraColorNameError(entry[0]) && typeof entry[1] === 'string' && isHexColor(entry[1]),
      )
      .slice(0, MAX_EXTRA_COLORS),
  )
}

/** The colours with `changes` applied; null removes one. Throws for what cannot be a colour, changing nothing. */
export function patchExtraColors(colors: ExtraColors, changes: unknown): ExtraColors {
  if (typeof changes !== 'object' || changes === null || Array.isArray(changes))
    throw new Error('extraColors is a table of name to hex colour, such as { "cobalt": "#1B3FD1" }.')
  const next = { ...colors }
  for (const [name, color] of Object.entries(changes)) {
    if (color === null) {
      delete next[name]
      continue
    }
    const problem = extraColorNameError(name)
    if (problem) throw new Error(problem)
    if (typeof color !== 'string' || !isHexColor(color))
      throw new Error(`Invalid colour for ${name}: ${JSON.stringify(color)}. Use a hex colour such as "#1B3FD1".`)
    next[name] = color
  }
  if (Object.keys(next).length > MAX_EXTRA_COLORS)
    throw new Error(`A theme has at most ${MAX_EXTRA_COLORS} colours of its own.`)
  return next
}
