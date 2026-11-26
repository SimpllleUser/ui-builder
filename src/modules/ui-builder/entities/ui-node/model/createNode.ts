import { getComponentDef } from './componentDefinitions'
import { TEXT_NODE_TYPE } from './constants'
import { createNodeId } from './nodeUtils'
import type { UiNode } from './types'

/** A new element of a component type, with the content the type starts with. */
export function createNode(type: string, name?: string): UiNode {
  const def = getComponentDef(type)
  if (!def) throw new Error('Unknown component type')
  const id = createNodeId()
  return {
    id,
    type,
    name: name ?? def.label,
    props: { ...def.defaultProps },
    classes: [...def.defaultClasses],
    slots: {},
    children: def.defaultTextChild
      ? [{ id: `${id}_text`, type: TEXT_NODE_TYPE, name: def.label, props: {}, classes: [], children: [], slots: {} }]
      : (def.defaultChildren ?? []).map(child => {
          if (typeof child === 'string') return createNode(child)
          const childNode = createNode(child.type, child.name)
          Object.assign(childNode.props, child.props)
          if (child.name && childNode.children[0]?.type === TEXT_NODE_TYPE) {
            childNode.children[0].name = child.name
          }
          return childNode
        }),
  }
}
