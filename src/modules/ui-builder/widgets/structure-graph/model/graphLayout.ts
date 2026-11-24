import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@vue-flow/core'
import type { BehaviorNote, OutlineNode, OutlineSection } from '../../../entities/ui-node'

/** Which way the tree grows: top to bottom, or left to right (shorter for wide trees). */
export enum GraphDirection {
  Vertical = 'TB',
  Horizontal = 'LR',
}

export const GRAPH_NODE_TYPE = 'structure'
export const GRAPH_NODE_WIDTH = 190
export const GRAPH_NODE_HEIGHT = 40
const NODE_SPACING = 24
const RANK_SPACING = 56

export interface GraphNodeData {
  label: string
  icon: string
  behaviors: BehaviorNote[]
  isSlot: boolean
  /** The root of the graph stands for the page, layout or component itself and cannot be selected on the canvas. */
  isSection: boolean
  /** The element's component name, shown as a tooltip. */
  type: string
  direction: GraphDirection
}

export type StructureGraphNode = Node<GraphNodeData>

export interface StructureGraph {
  nodes: StructureGraphNode[]
  edges: Edge[]
}

/** The id of the graph node that stands for the section itself starts with this. */
export const SECTION_NODE_PREFIX = 'section:'
const sectionNodeId = (section: OutlineSection) => `${SECTION_NODE_PREFIX}${section.id}`

/**
 * The structure of a page, layout or component as a graph: one node per element, one edge from each element to what
 * is inside it, placed by dagre so that nothing overlaps. The section itself is the root.
 */
export function buildGraph(
  section: OutlineSection,
  sectionIcon: string,
  direction: GraphDirection = GraphDirection.Vertical,
): StructureGraph {
  const layout = new dagre.graphlib.Graph()
  layout.setGraph({ rankdir: direction, nodesep: NODE_SPACING, ranksep: RANK_SPACING })
  layout.setDefaultEdgeLabel(() => ({}))

  const nodes: StructureGraphNode[] = []
  const edges: Edge[] = []
  const add = (id: string, data: Omit<GraphNodeData, 'direction'>, parentId: string | null) => {
    nodes.push({ id, type: GRAPH_NODE_TYPE, position: { x: 0, y: 0 }, data: { ...data, direction } })
    layout.setNode(id, { width: GRAPH_NODE_WIDTH, height: GRAPH_NODE_HEIGHT })
    if (parentId) {
      edges.push({ id: `${parentId}->${id}`, source: parentId, target: id })
      layout.setEdge(parentId, id)
    }
  }
  const visit = (node: OutlineNode, parentId: string) => {
    add(
      node.id,
      {
        label: node.label,
        icon: node.icon,
        behaviors: node.behaviors,
        isSlot: node.isSlot,
        isSection: false,
        type: node.type,
      },
      parentId,
    )
    node.children.forEach(child => visit(child, node.id))
  }

  const rootId = sectionNodeId(section)
  add(
    rootId,
    { label: section.title, icon: sectionIcon, behaviors: [], isSlot: false, isSection: true, type: section.detail },
    null,
  )
  section.roots.forEach(root => visit(root, rootId))

  dagre.layout(layout)
  for (const node of nodes) {
    const placed = layout.node(node.id)
    // dagre reports the centre of a node; the graph wants its top-left corner.
    node.position = { x: placed.x - GRAPH_NODE_WIDTH / 2, y: placed.y - GRAPH_NODE_HEIGHT / 2 }
  }
  return { nodes, edges }
}
