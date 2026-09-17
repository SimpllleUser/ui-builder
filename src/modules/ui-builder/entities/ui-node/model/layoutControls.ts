const sides: Record<string, string[]> = { a: ['t', 'r', 'b', 'l'], x: ['l', 'r'], y: ['t', 'b'], t: ['t'], r: ['r'], b: ['b'], l: ['l'] }
export function readSpacing(classes: string[], type: 'm' | 'p', side: string): number | string | null {
  const values = sides[side].map(s => {
    for (const direction of [s, ['l', 'r'].includes(s) ? 'x' : 'y', 'a']) {
      const cls = classes.find(c => new RegExp(`^${type}${direction}-(n?\\d+|auto)$`).test(c))
      if (cls) { const value = cls.slice(3); return value === 'auto' ? value : Number(value.replace('n', '-')) }
    }
    return null
  })
  return values.every(v => v === values[0]) ? values[0] : null
}
export function writeSpacing(classes: string[], type: 'm' | 'p', side: string, value: number | string | null): string[] {
  const values = Object.fromEntries(sides.a.map(s => [s, readSpacing(classes, type, s)]))
  for (const s of sides[side]) values[s] = value
  const result = classes.filter(c => !new RegExp(`^${type}[axytrbl]-(n?\\d+|auto)$`).test(c))
  for (const [s, v] of Object.entries(values)) if (v !== null) result.push(`${type}${s}-${typeof v === 'number' && v < 0 ? `n${-v}` : v}`)
  return result
}
export function readFlex(classes: string[]): string | null {
  const display = classes.find(c => c.startsWith('d-'))
  if (display !== 'd-flex') return display ?? null
  return `d-flex ${classes.find(c => ['flex-row', 'flex-column', 'flex-row-reverse', 'flex-column-reverse'].includes(c)) ?? 'flex-row'}`
}
export function writeFlex(classes: string[], value: string): string[] {
  return [...classes.filter(c => !c.startsWith('d-') && !['flex-row', 'flex-column', 'flex-row-reverse', 'flex-column-reverse'].includes(c)), ...value.split(' ').filter(Boolean)]
}
