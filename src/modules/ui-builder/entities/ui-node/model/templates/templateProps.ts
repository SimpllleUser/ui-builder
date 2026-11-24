import type { TemplateProps } from './templateElement'

/** One entry of a list setting (a quote, a question, a post…): every field is text. */
export type TextRecord = Record<string, string>

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** The text setting, or the default when it is missing or not text. */
export function readText(props: TemplateProps, key: string, fallback: string): string {
  const value = props[key]
  return typeof value === 'string' ? value : fallback
}

/** The list of texts, or the default when the setting is not a list of texts. */
export function readTexts(props: TemplateProps, key: string, fallback: string[]): string[] {
  const value = props[key]
  if (!Array.isArray(value)) return fallback
  return value.filter((item): item is string => typeof item === 'string')
}

/**
 * The list of entries, or the default when the setting is not a list. An entry keeps the fields of the
 * default entry, so a missing field is empty text instead of breaking the template.
 */
export function readRecords(props: TemplateProps, key: string, fallback: TextRecord[]): TextRecord[] {
  const value = props[key]
  if (!Array.isArray(value)) return fallback
  const fields = Object.keys(fallback[0] ?? {})
  return value.filter(isPlainObject).map(entry =>
    Object.fromEntries(
      fields.map(field => {
        const fieldValue = entry[field]
        return [field, typeof fieldValue === 'string' ? fieldValue : '']
      }),
    ),
  )
}

/** The list of nested settings (an entry with its own lists, like a footer column), or the default. */
export function readObjects(props: TemplateProps, key: string, fallback: TemplateProps[]): TemplateProps[] {
  const value = props[key]
  return Array.isArray(value) ? value.filter(isPlainObject) : fallback
}
