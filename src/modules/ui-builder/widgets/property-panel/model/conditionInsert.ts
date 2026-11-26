/** Something a person can put into a condition with one click: a variable name or a function call. */
export interface ConditionSnippet {
  /** What is written into the condition. */
  text: string
  /** The name the snippet starts with; typing a start of it (`ste`) is completed instead of repeated. */
  name: string
  /** Where the caret goes inside `text`, for example between the brackets of `empty()`. */
  caretOffset: number
  /** What the chip says when pointed at. */
  hint: string
}

export interface TextEdit {
  text: string
  caret: number
}

export const variableSnippet = (name: string, hint: string): ConditionSnippet => ({
  text: name,
  name,
  caretOffset: name.length,
  hint,
})

const functionSnippet = (name: string, hint: string): ConditionSnippet => ({
  text: `${name}()`,
  name,
  caretOffset: name.length + 1,
  hint,
})

export const FUNCTION_SNIPPETS: ConditionSnippet[] = [
  functionSnippet('empty', 'True for nothing, empty text or an empty list'),
  functionSnippet('contains', 'contains(text or list, piece or item)'),
  functionSnippet('length', 'The length of a text or list'),
  functionSnippet('lower', 'A text in small letters, to compare whatever the case'),
]

const PARTIAL_NAME = /[A-Za-z_$][\w$]*$/
const ENDS_A_VALUE = /[\w$)\]'"]$/
const STARTS_A_VALUE = /^[\w$('"[]/

/**
 * Writes the snippet where the caret is. A selection is replaced; a half-typed name that the snippet starts with is
 * completed; and a space is added where two words would otherwise run together.
 */
export function insertAtCaret(text: string, start: number, end: number, snippet: ConditionSnippet): TextEdit {
  let before = text.slice(0, start)
  const after = text.slice(end)
  if (start === end) {
    const partial = PARTIAL_NAME.exec(before)?.[0]
    if (partial && snippet.name.startsWith(partial)) before = before.slice(0, -partial.length)
  }
  const lead = ENDS_A_VALUE.test(before) ? ' ' : ''
  const trail = STARTS_A_VALUE.test(after) ? ' ' : ''
  return {
    text: `${before}${lead}${snippet.text}${trail}${after}`,
    caret: before.length + lead.length + snippet.caretOffset,
  }
}
