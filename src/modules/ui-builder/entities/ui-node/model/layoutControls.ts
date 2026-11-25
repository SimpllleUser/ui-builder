import type { SpacingType } from './enums'
const sides: Record<string, string[]> = {
  a: ['t', 'r', 'b', 'l'],
  x: ['l', 'r'],
  y: ['t', 'b'],
  t: ['t'],
  r: ['r'],
  b: ['b'],
  l: ['l'],
}
export function readSpacing(classes: string[], type: SpacingType, side: string): number | string | null {
  const values = sides[side].map(s => {
    for (const direction of [s, ['l', 'r'].includes(s) ? 'x' : 'y', 'a']) {
      const cls = classes.find(c => new RegExp(`^${type}${direction}-(n?\\d+|auto)$`).test(c))
      if (cls) {
        const value = cls.slice(3)
        return value === 'auto' ? value : Number(value.replace('n', '-'))
      }
    }
    return null
  })
  return values.every(v => v === values[0]) ? values[0] : null
}
export function writeSpacing(
  classes: string[],
  type: SpacingType,
  side: string,
  value: number | string | null,
): string[] {
  const values = Object.fromEntries(sides.a.map(s => [s, readSpacing(classes, type, s)]))
  for (const s of sides[side]) values[s] = value
  const result = classes.filter(c => !new RegExp(`^${type}[axytrbl]-(n?\\d+|auto)$`).test(c))
  for (const [s, v] of Object.entries(values))
    if (v !== null) result.push(`${type}${s}-${typeof v === 'number' && v < 0 ? `n${-v}` : v}`)
  return result
}
/**
 * The classes the display control owns. Responsive and print ones (`d-md-none`, `d-print-none`) are not among them:
 * the control does not show them, so it must not remove them.
 */
const DISPLAY_CLASS = /^d-(none|inline|inline-block|block|table|table-row|table-cell|flex|inline-flex)$/
const FLEX_DIRECTION_CLASSES = ['flex-row', 'flex-column', 'flex-row-reverse', 'flex-column-reverse']

export function readFlex(classes: string[]): string | null {
  const display = classes.find(c => DISPLAY_CLASS.test(c))
  if (display !== 'd-flex') return display ?? null
  return `d-flex ${classes.find(c => FLEX_DIRECTION_CLASSES.includes(c)) ?? 'flex-row'}`
}
export function writeFlex(classes: string[], value: string): string[] {
  return [
    ...classes.filter(c => !DISPLAY_CLASS.test(c) && !FLEX_DIRECTION_CLASSES.includes(c)),
    ...value.split(' ').filter(Boolean),
  ]
}
