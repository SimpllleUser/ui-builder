import { TEXT_NODE_TYPE } from './constants'
import { describeBehaviors, type BehaviorNote } from './behaviorSummary'
import { getComponentDef } from './componentDefinitions'
import type { Prefab, Project, UiNode } from './types'

export enum OutlineKind {
  Page = 'page',
  Layout = 'layout',
  Component = 'component',
}

export interface OutlineNode {
  /** The element's id; a named slot has none of its own, so it is `<element id>#<slot name>`. */
  id: string
  label: string
  /** The component's name such as `VBtn`; empty for text and for slots. */
  type: string
  /** An icon name for the kind of element. */
  icon: string
  /** What the element does in Preview (repeat, condition, link, click). */
  behaviors: BehaviorNote[]
  /** A named area of the parent that holds the children below it. */
  isSlot: boolean
  children: OutlineNode[]
}

export interface OutlineSection {
  /** A page's id, `layout`, or a saved component's id. */
  id: string
  kind: OutlineKind
  title: string
  /** The route of a page, or what the section is. */
  detail: string
  roots: OutlineNode[]
}

const LAYOUT_ID = 'layout'
const TEXT_LABEL_LENGTH = 40
const DEFAULT_SLOT = 'default'
const TEXT_ICON = 'mdi-format-text'
const SLOT_ICON = 'mdi-view-dashboard-edit-outline'
const COMPONENT_ICON = 'mdi-shape-outline'

function nodeLabel(node: UiNode): string {
  if (node.type === TEXT_NODE_TYPE) {
    const text = node.name.length > TEXT_LABEL_LENGTH ? `${node.name.slice(0, TEXT_LABEL_LENGTH)}…` : node.name
    return `“${text}”`
  }
  return node.name || (getComponentDef(node.type)?.label ?? node.type)
}

function toOutline(node: UiNode): OutlineNode {
  const slots = Object.entries(node.slots)
    .filter(([name, nodes]) => name !== DEFAULT_SLOT && nodes.length)
    .map(([name, nodes]) => ({
      id: `${node.id}#${name}`,
      label: `#${name}`,
      type: '',
      icon: SLOT_ICON,
      behaviors: [],
      isSlot: true,
      children: nodes.map(toOutline),
    }))
  return {
    id: node.id,
    label: nodeLabel(node),
    type: node.type === TEXT_NODE_TYPE ? '' : node.type,
    icon: node.type === TEXT_NODE_TYPE ? TEXT_ICON : (getComponentDef(node.type)?.treeIcon ?? COMPONENT_ICON),
    behaviors: describeBehaviors(node),
    isSlot: false,
    children: [...node.children.map(toOutline), ...(node.slots[DEFAULT_SLOT] ?? []).map(toOutline), ...slots],
  }
}

/** The elements inside a page or layout; its own root is only the empty canvas, so it is left out. */
const innerRoots = (root: UiNode): OutlineNode[] => toOutline(root).children

/** The structure of the whole project: every page, the shared layout and every saved component. */
export function buildOutline(project: Project, prefabs: Prefab[]): OutlineSection[] {
  const sections: OutlineSection[] = project.pages.map(page => ({
    id: page.id,
    kind: OutlineKind.Page,
    title: page.name,
    detail: page.path,
    roots: innerRoots(page.root),
  }))
  if (project.layout)
    sections.push({
      id: LAYOUT_ID,
      kind: OutlineKind.Layout,
      title: 'Shared layout',
      detail: 'around every page',
      roots: innerRoots(project.layout),
    })
  for (const prefab of prefabs)
    sections.push({
      id: prefab.prefabId,
      kind: OutlineKind.Component,
      title: prefab.name,
      detail: 'saved component',
      roots: [toOutline(prefab.node)],
    })
  return sections
}

const describeNode = (node: OutlineNode) =>
  [
    node.label,
    node.type && node.type !== node.label ? `(${node.type})` : '',
    node.behaviors.length ? `[${node.behaviors.map(note => note.shortLabel).join(', ')}]` : '',
  ]
    .filter(Boolean)
    .join(' ')

function branchLines(nodes: OutlineNode[], prefix: string): string[] {
  return nodes.flatMap((node, index) => {
    const last = index === nodes.length - 1
    return [
      `${prefix}${last ? '└─ ' : '├─ '}${describeNode(node)}`,
      ...branchLines(node.children, `${prefix}${last ? '   ' : '│  '}`),
    ]
  })
}

/** The structure as plain text with branch lines, to paste into a note, an issue or a chat. */
export function outlineToText(section: OutlineSection): string {
  const header = `${section.title} — ${section.detail}`
  return [header, ...(section.roots.length ? branchLines(section.roots, '') : ['(empty)'])].join('\n')
}

/** Every section as text, separated by a blank line. */
export const outlineToTextAll = (sections: OutlineSection[]): string => sections.map(outlineToText).join('\n\n')
