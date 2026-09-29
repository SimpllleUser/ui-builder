import type { UiNode } from './types'

export type TemplateKind = 'card' | 'form' | 'columns'

export interface TemplateContext {
  createNode(type: string, name?: string): UiNode
  cloneNodeWithNewIds(node: UiNode): UiNode
  appendNode(parentId: string, node: UiNode, slotName: string | null): boolean
}

export function addTemplate(context: TemplateContext, kind: TemplateKind): void {
  const card = createCard(context, kind)

  if (kind === 'columns') {
    const row = context.createNode('VRow', 'Two columns')
    row.children = [1, 2].map(number => {
      const column = context.createNode('VCol', `Column ${number}`)
      column.props = { cols: 12, md: 6 }
      column.children = [context.cloneNodeWithNewIds(card)]
      return column
    })
    context.appendNode('root-canvas', row, null)
    return
  }

  context.appendNode('root-canvas', card, null)
}

function createCard(context: TemplateContext, kind: TemplateKind): UiNode {
  const card = context.createNode('VCard', kind === 'form' ? 'Contact form' : 'Welcome card')
  card.classes = ['pa-6', 'rounded-lg']

  const title = context.createNode('VCardTitle')
  title.classes.push('text-wrap')
  title.children[0].name = kind === 'form' ? 'Get in touch' : 'Your next idea starts here'

  const text = context.createNode('VCardText')
  text.children[0].name = 'Select an element to edit its content and appearance.'
  card.children = [title, text]

  if (kind === 'form') {
    for (const label of ['Name', 'Email', 'Message']) {
      const input = context.createNode('VTextField')
      input.props = { label, variant: 'outlined', type: label === 'Email' ? 'email' : 'text' }
      card.children.push(input)
    }
  }

  const button = context.createNode('VBtn')
  button.props = { color: 'primary', variant: 'flat' }
  button.children[0].name = kind === 'form' ? 'Send message' : 'Get started'
  card.children.push(button)

  return card
}
