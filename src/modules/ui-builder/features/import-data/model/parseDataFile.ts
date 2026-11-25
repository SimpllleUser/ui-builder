import { parseCsvRows } from '../../../../../shared/lib/csv'

/** The data becomes part of the project and of every undo step, so it has to stay small. */
export const MAX_DATA_FILE_BYTES = 500_000

// Digits with a leading zero, such as a postal code, stay text.
const NUMBER = /^-?(0|[1-9]\d*)(\.\d+)?$/
const FORBIDDEN_COLUMNS = new Set(['__proto__', 'constructor', 'prototype'])

function cellValue(text: string): unknown {
  if (text === 'true' || text === 'false') return text === 'true'
  return NUMBER.test(text) && Math.abs(Number(text)) <= Number.MAX_SAFE_INTEGER ? Number(text) : text
}

/** A CSV table as a list of records, named by its first row. */
function recordsFromCsv(text: string) {
  const [header, ...rows] = parseCsvRows(text)
  if (!header) throw new Error('The file is empty.')
  const columns = header.map((name, index) => name.trim() || `column${index + 1}`)
  return rows.map(row =>
    Object.fromEntries(
      columns.flatMap((column, index) =>
        FORBIDDEN_COLUMNS.has(column) ? [] : [[column, cellValue(row[index] ?? '')]],
      ),
    ),
  )
}

/** The value of a `.json` or `.csv` file. Throws with a readable reason. */
export function parseDataFile(fileName: string, text: string): unknown {
  if (text.length > MAX_DATA_FILE_BYTES)
    throw new Error(`The file is too large. Use at most ${MAX_DATA_FILE_BYTES / 1000} KB.`)
  const content = text.replace(/^\uFEFF/, '')
  if (/\.csv$/i.test(fileName)) return recordsFromCsv(content)
  try {
    return JSON.parse(content) as unknown
  } catch {
    throw new Error('The file is not valid JSON.')
  }
}
