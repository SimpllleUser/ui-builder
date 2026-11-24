import { jsString, templateLiteralText } from './jsLiteral'

const PATH = /^[A-Za-z_$][\w$]*(?:\.[\w$]+|\[\d+\])*$/
const PATH_PART = /\.([\w$]+)|\[(\d+)\]/g
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const FULL_BINDING = /^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/
const BINDING = /\{\{\s*([^{}]+?)\s*\}\}/g

export interface BoundText {
  /** The text has `{{ }}` values, so it is code in the template instead of plain text. */
  dynamic: boolean
  /** Plain text when not dynamic, a JavaScript expression when dynamic. */
  code: string
}

/** `a.b[0].c` as `a?.b?.[0]?.c`, so a missing value gives nothing instead of stopping the page. */
export function pathToJs(path: string): string {
  if (!PATH.test(path)) return 'undefined'
  const root = path.split(/[.[]/)[0]
  if (FORBIDDEN_KEYS.has(root)) return 'undefined'
  let code = root
  for (const [, name, index] of path.slice(root.length).matchAll(PATH_PART)) {
    if (name && FORBIDDEN_KEYS.has(name)) return 'undefined'
    code += name ? `?.${name}` : `?.[${index}]`
  }
  return code
}

/** A value that is only `{{ path }}` keeps its type; mixed text becomes a template literal, like in Preview. */
export function bindText(text: string): BoundText {
  const full = FULL_BINDING.exec(text)
  if (full) return { dynamic: true, code: pathToJs(full[1]) }
  if (!text.includes('{{')) return { dynamic: false, code: text }
  let code = ''
  let last = 0
  for (const match of text.matchAll(BINDING)) {
    code += templateLiteralText(text.slice(last, match.index)) + `\${${pathToJs(match[1])} ?? ''}`
    last = match.index + match[0].length
  }
  return { dynamic: true, code: `\`${code}${templateLiteralText(text.slice(last))}\`` }
}

/** Text of an element as it goes between tags: `{{ }}` values stay, characters of markup are escaped. */
export function bindTextForTemplate(text: string): string {
  const escape = (chunk: string) => chunk.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  let result = ''
  let last = 0
  for (const match of text.matchAll(BINDING)) {
    result += escape(text.slice(last, match.index)) + `{{ ${pathToJs(match[1])} }}`
    last = match.index + match[0].length
  }
  return result + escape(text.slice(last))
}

/** A string that has to sit inside a double-quoted attribute. */
export const escapeAttribute = (text: string) => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;')

/** The same text as a JavaScript string expression: a literal, or a template literal with values. */
export function textToJsExpression(text: string): string {
  const bound = bindText(text)
  return bound.dynamic ? bound.code : jsString(bound.code)
}
