import { behaviorOf } from './componentBehaviors'
import { actionsOf } from './events'
import { EventName } from './enums'
import { checkRules } from './validationRules'
import { childNodes, walkNodes } from './treeUtils'
import type { UiNode } from './types'

export const isForm = (node: UiNode) => !!behaviorOf(node.type).isForm
export const isSubmitButton = (node: UiNode) => node.type === 'VBtn' && node.props.type === 'submit'

/** The form an element is inside, or the element itself when it is one. */
export function enclosingForm(root: UiNode, id: string): UiNode | null {
  const search = (node: UiNode, form: UiNode | null): UiNode | null | undefined => {
    const current = isForm(node) ? node : form
    if (node.id === id) return current
    for (const child of childNodes(node)) {
      const found = search(child, current)
      if (found !== undefined) return found
    }
    return undefined
  }
  return search(root, null) ?? null
}

/** The variables the fields of a form write to. */
export const formVariables = (form: UiNode): string[] => [
  ...new Set([...walkNodes(form)].flatMap(node => node.model ?? [])),
]

export interface FieldError {
  id: string
  name: string
  message: string
}

/** What the rules of a form's fields say about the current values. */
export const formErrors = (form: UiNode, state: Record<string, unknown>): FieldError[] =>
  [...walkNodes(form)].flatMap(node => {
    const message = checkRules(node.rules, node.model ? state[node.model] : node.props.modelValue)
    return message ? [{ id: node.id, name: node.name, message }] : []
  })

export const submitActions = (form: UiNode) => actionsOf(form.events, EventName.Submit)
