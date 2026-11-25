/**
 * A project file is the document with the theme beside it under `theme`. The document's own format does not change:
 * readers that do not know the key ignore it, and files without it are still accepted.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function parseRecord(text: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(text)
    return isRecord(value) ? value : null
  } catch {
    return null
  }
}

/** A damaged document or theme is left out of the merge, so what was saved can always be taken out. */
export function toProjectFile(document: string, theme: string | null): string {
  const content = parseRecord(document)
  const settings = theme === null ? null : parseRecord(theme)
  return content && settings ? JSON.stringify({ ...content, theme: settings }, null, 2) : document
}

/** The theme a file carries, as saved text, or null when it has none. */
export function themeOfProjectFile(text: string): string | null {
  const theme = parseRecord(text)?.theme
  return isRecord(theme) ? JSON.stringify(theme) : null
}
