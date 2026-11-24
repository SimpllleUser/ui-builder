const IDENTIFIER = /^[A-Za-z_$][\w$]*$/
const INLINE_LIMIT = 72
const INDENT = '  '

/** A JavaScript string in single quotes, so it can sit inside a double-quoted HTML attribute. */
export const jsString = (text: string) =>
  `'${text.replaceAll('\\', '\\\\').replaceAll("'", "\\'").replaceAll('\n', '\\n').replaceAll('\r', '\\r')}'`

/** The text as the inside of a template literal: backticks, `${` and backslashes are kept literal. */
export const templateLiteralText = (text: string) =>
  text.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${')

const keyToJs = (key: string) => (IDENTIFIER.test(key) ? key : jsString(key))

/** A value as JavaScript source. Short values stay on one line; long lists and objects are spread over lines. */
export function jsLiteral(value: unknown, indent = 0): string {
  if (typeof value === 'string') return jsString(value)
  if (value === undefined) return 'undefined'
  if (value === null || typeof value !== 'object') return String(value)
  const entries = Array.isArray(value)
    ? value.map(item => jsLiteral(item, indent + 1))
    : Object.entries(value).map(([key, item]) => `${keyToJs(key)}: ${jsLiteral(item, indent + 1)}`)
  const [open, close] = Array.isArray(value) ? ['[', ']'] : ['{', '}']
  if (!entries.length) return `${open}${close}`
  const inline = Array.isArray(value)
    ? `${open}${entries.join(', ')}${close}`
    : `${open} ${entries.join(', ')} ${close}`
  if (inline.length <= INLINE_LIMIT && !inline.includes('\n')) return inline
  const pad = INDENT.repeat(indent + 1)
  return `${open}\n${entries.map(entry => `${pad}${entry},`).join('\n')}\n${INDENT.repeat(indent)}${close}`
}
