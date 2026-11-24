import { OUTLET_NODE_TYPE, TEXT_NODE_TYPE } from './constants'
import { ActionType } from './enums'
import { addHelper, expressionToJs, HelperName } from './expressionToJs'
import { jsLiteral } from './jsLiteral'
import { parseLiteral } from './runtime'
import { tableHeight, tableStyleClasses } from './tableBindings'
import type { UiAction, UiNode } from './types'
import { bindText, bindTextForTemplate, escapeAttribute, pathToJs, textToJsExpression } from './vueBindings'

const INDENT = '  '
const LINE_LIMIT = 100
const CELL_SLOT_PREFIX = 'item.'
const DEFAULT_SLOT = 'default'
/** Props that exist only in the editor; they become classes or are left out. */
const EDITOR_ONLY_PROPS = new Set(['mask', 'striped', 'bordered', 'headerColor', 'class', 'style'])
const TABLE_TYPE = 'VDataTable'

export interface TemplateContext {
  /** Names of variables; a word that is not one next to `==` is read as text. */
  known: ReadonlySet<string>
  helpers: Set<HelperName>
  usage: { router: boolean }
}

function propToAttribute(key: string, value: unknown): string {
  if (typeof value === 'string') {
    const bound = bindText(value)
    return bound.dynamic ? `:${key}="${bound.code}"` : `${key}="${escapeAttribute(value)}"`
  }
  if (value === true) return key
  return `:${key}="${jsLiteral(value)}"`
}

function propsToAttributes(node: UiNode): string[] {
  const entries = Object.entries(node.props).filter(([key]) => !EDITOR_ONLY_PROPS.has(key))
  const attributes = entries.map(([key, value]) =>
    node.type === TABLE_TYPE && key === 'height'
      ? propToAttribute(key, tableHeight(value))
      : propToAttribute(key, value),
  )
  const classes = [
    ...(typeof node.props.class === 'string' ? [node.props.class] : []),
    ...node.classes,
    ...(node.type === TABLE_TYPE ? tableStyleClasses(node.props) : []),
  ].filter(Boolean)
  if (classes.length) attributes.push(`class="${escapeAttribute(classes.join(' '))}"`)
  const { style } = node.props
  if (typeof style === 'string' && style.trim()) attributes.push(`style="${escapeAttribute(style)}"`)
  else if (style !== null && typeof style === 'object') attributes.push(`:style="${jsLiteral(style)}"`)
  return attributes
}

function actionToStatement(action: UiAction, context: TemplateContext): string {
  if (action.type === ActionType.Navigate) {
    context.usage.router = true
    return `router.push(${textToJsExpression(action.to)})`
  }
  if (action.type === ActionType.Toggle) return `${action.key} = !${action.key}`
  const bound = bindText(action.value)
  if (!bound.dynamic) return `${action.key} = ${jsLiteral(parseLiteral(action.value))}`
  // A single value keeps its type and is copied, like Preview stores a table row.
  if (/^\s*\{\{[^{}]+\}\}\s*$/.test(action.value)) {
    addHelper(context.helpers, HelperName.CopyOf)
    return `${action.key} = copyOf(${bound.code})`
  }
  return `${action.key} = ${bound.code}`
}

function eventAttributes(node: UiNode, context: TemplateContext): string[] {
  const click = node.events?.click
  if (!click) return []
  const statement = actionToStatement(click, context)
  // A table row hands over its row as `item`; elsewhere the click must not also reach the row.
  return node.type === TABLE_TYPE ? [`@click:row="(_, { item }) => ${statement}"`] : [`@click.stop="${statement}"`]
}

function modelAttributes(node: UiNode): string[] {
  return node.model ? [`v-model="${node.model}"`] : []
}

function conditionAttributes(node: UiNode, context: TemplateContext): string[] {
  return node.vIf?.trim() ? [`v-if="${expressionToJs(node.vIf, context.known, context.helpers)}"`] : []
}

const repeatAttributes = (node: UiNode): string[] =>
  node.vFor?.trim() ? [`v-for="(item, index) in ${pathToJs(node.vFor.trim())}"`, ':key="index"'] : []

function openTag(pad: string, tag: string, attributes: string[], selfClosing: boolean): string[] {
  const single = `${pad}<${tag}${attributes.map(attribute => ` ${attribute}`).join('')}${selfClosing ? ' /' : ''}>`
  if (single.length <= LINE_LIMIT || !attributes.length) return [single]
  return [
    `${pad}<${tag}`,
    ...attributes.map(attribute => `${pad}${INDENT}${attribute}`),
    `${pad}${selfClosing ? '/>' : '>'}`,
  ]
}

const slotAttribute = (name: string) =>
  name.startsWith(CELL_SLOT_PREFIX) ? `#${name}="{ item, value, index }"` : `#${name}`

function renderChildren(node: UiNode, context: TemplateContext, depth: number): string[] {
  const pad = INDENT.repeat(depth)
  const lines = renderNodes([...node.children, ...(node.slots[DEFAULT_SLOT] ?? [])], context, depth)
  for (const [name, nodes] of Object.entries(node.slots)) {
    if (name === DEFAULT_SLOT || !nodes.length) continue
    lines.push(
      `${pad}<template ${slotAttribute(name)}>`,
      ...renderNodes(nodes, context, depth + 1),
      `${pad}</template>`,
    )
  }
  return lines
}

function renderText(node: UiNode, context: TemplateContext, depth: number): string[] {
  const pad = INDENT.repeat(depth)
  const text = bindTextForTemplate(node.name)
  const directives = [...repeatAttributes(node), ...conditionAttributes(node, context)]
  if (!directives.length) return [`${pad}${text}`]
  return [`${pad}<span ${directives.join(' ')}>${text}</span>`]
}

function renderElement(node: UiNode, context: TemplateContext, depth: number, withRepeat: boolean): string[] {
  const pad = INDENT.repeat(depth)
  const attributes = [
    ...(withRepeat ? repeatAttributes(node) : []),
    ...conditionAttributes(node, context),
    ...modelAttributes(node),
    ...propsToAttributes(node),
    ...eventAttributes(node, context),
  ]
  const children = renderChildren(node, context, depth + 1)
  if (!children.length) return openTag(pad, node.type, attributes, true)
  const [only] = node.children
  const hasOnlyText = node.children.length === 1 && only.type === TEXT_NODE_TYPE && children.length === 1
  const open = openTag(pad, node.type, attributes, false)
  if (hasOnlyText && open.length === 1 && !only.vIf && !only.vFor) {
    const inline = `${open[0]}${children[0].trim()}</${node.type}>`
    if (inline.length <= LINE_LIMIT) return [inline]
  }
  return [...open, ...children, `${pad}</${node.type}>`]
}

function renderNode(node: UiNode, context: TemplateContext, depth: number): string[] {
  const pad = INDENT.repeat(depth)
  if (node.type === OUTLET_NODE_TYPE) return [`${pad}<RouterView />`]
  if (node.type === TEXT_NODE_TYPE) return renderText(node, context, depth)
  // In a template `v-if` is checked before `v-for`, but here a copy's own `item` decides, so the repeat wraps the element.
  if (node.vFor?.trim() && node.vIf?.trim()) {
    return [
      `${pad}<template ${repeatAttributes(node).join(' ')}>`,
      ...renderElement(node, context, depth + 1, false),
      `${pad}</template>`,
    ]
  }
  return renderElement(node, context, depth, true)
}

export function renderNodes(nodes: UiNode[], context: TemplateContext, depth: number): string[] {
  return nodes.flatMap(node => renderNode(node, context, depth))
}
