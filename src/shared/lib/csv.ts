const DELIMITERS = [',', ';', '\t']

/** Rows of a CSV text. Quoted fields may hold delimiters, line breaks and doubled quotes. */
export function parseCsvRows(text: string, delimiter = detectDelimiter(text)): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const endField = () => {
    row.push(field)
    field = ''
  }
  const endRow = () => {
    endField()
    // A blank line is not a row.
    if (row.length > 1 || row[0] !== '') rows.push(row)
    row = []
  }
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (quoted) {
      if (char !== '"') field += char
      else if (text[index + 1] === '"') field += text[++index]
      else quoted = false
    } else if (char === '"' && field === '') quoted = true
    else if (char === delimiter) endField()
    else if (char === '\n') endRow()
    else if (char !== '\r') field += char
  }
  if (quoted) throw new Error('A quoted field is not closed.')
  if (field !== '' || row.length) endRow()
  return rows
}

/** The delimiter the first line uses most. */
function detectDelimiter(text: string): string {
  const header = text.split('\n', 1)[0]
  const count = (delimiter: string) => header.split(delimiter).length
  return DELIMITERS.reduce((best, delimiter) => (count(delimiter) > count(best) ? delimiter : best))
}
