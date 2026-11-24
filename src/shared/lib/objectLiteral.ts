const INDENT = '  '
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/

const quote = (text: string) => `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const key = (name: string) => (IDENTIFIER.test(name) ? name : quote(name))

/** Source code for a plain value, formatted like hand-written TypeScript (single quotes, bare keys). */
export function toObjectLiteral(value: unknown, depth = 0): string {
  if (typeof value === 'string') return quote(value)
  if (value === null || typeof value !== 'object') return String(value)
  const inner = INDENT.repeat(depth + 1)
  if (Array.isArray(value)) return `[${value.map(item => toObjectLiteral(item, depth)).join(', ')}]`
  const entries = Object.entries(value)
  if (!entries.length) return '{}'
  const lines = entries.map(([name, item]) => `${inner}${key(name)}: ${toObjectLiteral(item, depth + 1)},`)
  return `{\n${lines.join('\n')}\n${INDENT.repeat(depth)}}`
}
