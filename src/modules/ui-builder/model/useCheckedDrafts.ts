import { ref } from 'vue'

/**
 * Text fields that are checked when the person leaves them, not on every keystroke.
 * A wrong value stays in the field with the reason beside it until it is fixed; a right one is applied.
 * Several fields can share one instance: each is told apart by a key (a column key, a page id…).
 */
export function useCheckedDrafts(
  /** Why `value` is not acceptable for the field `key`, or null when it is. */
  validate: (key: string, value: string) => string | null,
  apply: (key: string, value: string) => void,
) {
  const drafts = ref<Record<string, string>>({})
  const errors = ref<Record<string, string>>({})

  const without = (map: Record<string, string>, key: string) => {
    const { [key]: _removed, ...rest } = map
    return rest
  }

  /** What the field shows: the text being typed, or the saved value. */
  const shown = (key: string, saved: string | undefined) => drafts.value[key] ?? saved ?? ''
  const errorOf = (key: string) => (errors.value[key] ? [errors.value[key]] : [])

  const edit = (key: string, value: string | null) => {
    drafts.value = { ...drafts.value, [key]: value ?? '' }
    errors.value = without(errors.value, key)
  }
  const commit = (key: string) => {
    const draft = drafts.value[key]
    if (draft === undefined) return
    const value = draft.trim()
    const error = validate(key, value)
    if (error) {
      errors.value = { ...errors.value, [key]: error }
      return
    }
    drafts.value = without(drafts.value, key)
    apply(key, value)
  }
  /** Forget everything typed, e.g. when another element is selected. */
  const reset = () => {
    drafts.value = {}
    errors.value = {}
  }

  return { shown, errorOf, edit, commit, reset }
}
