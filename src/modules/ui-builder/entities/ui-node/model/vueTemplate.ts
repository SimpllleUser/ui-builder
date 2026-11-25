import { behaviorOf, clickEventOf, componentProps } from './componentBehaviors'
import { CELL_SLOT_PREFIX, cellSlotName } from './componentDefinitions'
import { OUTLET_NODE_TYPE, TEXT_NODE_TYPE } from './constants'
import { actionToCode, lacksVariable, type CodeContext } from './actions'
import { ClickEvent } from './enums'
import { responsiveRules } from './responsiveStyle'
import { addHelper, expressionToJs, HelperName } from './expressionToJs'
import { jsLiteral, jsString } from './jsLiteral'
import { chipColumnKeys, STATUS_CHIP_PROPS } from './statusChips'
import type { UiNode } from './types'
import { bindText, bindTextForTemplate, escapeAttribute, pathToJs } from './vueBindings'

const INDENT = '  '
const LINE_LIMIT = 100
const DEFAULT_SLOT = 'default'

export interface TemplateContext extends CodeContext {
  /** Names of variables; a word that is not one next to `==` is read as text. */
  known: ReadonlySet<string>
  /** Style rules the template needs, for elements that look different on smaller screens. */
  styles: Set<string>
}

const jsLiteralInline = (texts: string[]) => `[${texts.map(jsString).join(', ')}]`

function propToAttribute(key: string, value: unknown): string {
  if (typeof value === 'string') {
    const bound = bindText(value)
    return bound.dynamic ? `:${key}="${bound.code}"` : `${key}="${escapeAttribute(value)}"`
  }
  if (value === true) return key
  return `:${key}="${jsLiteral(value)}"`
}

function propsToAttributes(node: UiNode, context: TemplateContext): string[] {
  const responsive = responsiveRules(node)
  if (responsive) context.styles.add(responsive.css)
  const attributes = Object.entries(componentProps(node.type, node.props)).map(([key, value]) =>
    propToAttribute(key, value),
  )
  const classes = [
    ...(typeof node.props.class === 'string' ? [node.props.class] : []),
    ...node.classes,
    ...(behaviorOf(node.type).editorClasses?.(node.props) ?? []),
    ...(responsive ? [responsive.className] : []),
  ].filter(Boolean)
  if (classes.length) attributes.push(`class="${escapeAttribute(classes.join(' '))}"`)
  const style = responsive ? responsive.inlineStyle : node.props.style
  if (typeof style === 'string' && style.trim()) attributes.push(`style="${escapeAttribute(style)}"`)
  else if (style !== null && typeof style === 'object' && Object.keys(style).length)
    attributes.push(`:style="${jsLiteral(style)}"`)
  return attributes
}

function eventAttributes(node: UiNode, context: TemplateContext): string[] {
  const click = node.events?.click
  if (!click) return []
  const isRowClick = clickEventOf(node.type) === ClickEvent.Row
  // Like Preview, an unfinished action does nothing, but an element's click still does not reach the row around it.
  if (lacksVariable(click)) return isRowClick ? [] : [`@${ClickEvent.Element}.stop`]
  const statement = actionToCode(click, context)
  // A table row hands over its row as `item`; elsewhere the click must not also reach the row.
  return isRowClick
    ? [`@${ClickEvent.Row}="(_, { item }) => ${statement}"`]
    : [`@${ClickEvent.Element}.stop="${statement}"`]
}

/** A masked input formats what is typed before it reaches the variable, as in Preview. */
function modelAttributes(node: UiNode, context: TemplateContext): string[] {
  if (!node.model) return []
  const { mask } = node.props
  if (typeof mask !== 'string' || !mask) return [`v-model="${node.model}"`]
  addHelper(context.helpers, HelperName.ApplyInputMask)
  const bound = bindText(mask)
  const maskCode = escapeAttribute(bound.dynamic ? bound.code : jsString(mask))
  return [`:model-value="${node.model}"`, `@update:model-value="${node.model} = applyInputMask($event, ${maskCode})"`]
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

function slotAttribute(type: string, name: string): string {
  const params = behaviorOf(type).slotParams?.(name) ?? []
  return params.length ? `#${name}="{ ${params.join(', ')} }"` : `#${name}`
}

/** A key that can be written into a slot name as it is. */
const PLAIN_SLOT_KEY = /^[\w$.-]+$/

function statusChip(context: TemplateContext, depth: number): string[] {
  addHelper(context.helpers, HelperName.StatusChipColor)
  const attributes = Object.entries(STATUS_CHIP_PROPS).map(([key, value]) => propToAttribute(key, value))
  const chip = `<VChip ${attributes.join(' ')} :color="statusChipColor(value)">`
  return [`${INDENT.repeat(depth)}${chip}{{ String(value ?? '') }}</VChip>`]
}

/** One cell template for every column in `keys`, a list that is only known when the page runs. */
function chipLoop(keys: string, context: TemplateContext, depth: number): string[] {
  const pad = INDENT.repeat(depth)
  const slot = `#[\`${CELL_SLOT_PREFIX}\${key}\`]="{ value }"`
  return [
    `${pad}<template v-for="key in ${escapeAttribute(keys)}" ${slot}>`,
    ...statusChip(context, depth + 1),
    `${pad}</template>`,
  ]
}

/** The cells of "Status chip" columns, as Preview draws them. Cells with content of their own are left alone. */
function statusChipTemplates(node: UiNode, context: TemplateContext, depth: number): string[] {
  if (!behaviorOf(node.type).hasStatusChips) return []
  const ownCells = Object.entries(node.slots)
    .filter(([, nodes]) => nodes.length)
    .map(([name]) => name)
  const { headers } = node.props

  if (typeof headers === 'string') {
    const bound = bindText(headers)
    if (!bound.dynamic) return []
    addHelper(context.helpers, HelperName.StatusChipKeys)
    const taken = ownCells
      .filter(name => name.startsWith(CELL_SLOT_PREFIX))
      .map(name => name.slice(CELL_SLOT_PREFIX.length))
    const skip = taken.length ? `.filter(key => !${jsLiteralInline(taken)}.includes(key))` : ''
    return chipLoop(`statusChipKeys(${bound.code})${skip}`, context, depth)
  }

  const pad = INDENT.repeat(depth)
  const keys = chipColumnKeys(headers).filter(key => !ownCells.includes(cellSlotName(key)))
  const unusual = keys.filter(key => !PLAIN_SLOT_KEY.test(key))
  return [
    ...keys
      .filter(key => PLAIN_SLOT_KEY.test(key))
      .flatMap(key => [
        `${pad}<template #${cellSlotName(key)}="{ value }">`,
        ...statusChip(context, depth + 1),
        `${pad}</template>`,
      ]),
    ...(unusual.length ? chipLoop(jsLiteralInline(unusual), context, depth) : []),
  ]
}

function renderChildren(node: UiNode, context: TemplateContext, depth: number): string[] {
  const pad = INDENT.repeat(depth)
  const lines = renderNodes([...node.children, ...(node.slots[DEFAULT_SLOT] ?? [])], context, depth)
  for (const [name, nodes] of Object.entries(node.slots)) {
    if (name === DEFAULT_SLOT || !nodes.length) continue
    lines.push(
      `${pad}<template ${slotAttribute(node.type, name)}>`,
      ...renderNodes(nodes, context, depth + 1),
      `${pad}</template>`,
    )
  }
  lines.push(...statusChipTemplates(node, context, depth))
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
    ...modelAttributes(node, context),
    ...propsToAttributes(node, context),
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
