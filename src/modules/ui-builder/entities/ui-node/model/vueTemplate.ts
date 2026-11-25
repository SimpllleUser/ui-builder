import { behaviorOf, clickEventOf, componentProps } from './componentBehaviors'
import { CELL_SLOT_PREFIX, cellSlotName } from './componentDefinitions'
import { OUTLET_NODE_TYPE, TEXT_NODE_TYPE } from './constants'
import { actionToCode, lacksVariable, type CodeContext } from './actions'
import { ActionType, ClickEvent, EventName } from './enums'
import { actionsOf, eventEntries } from './events'
import { formVariables, isForm } from './forms'
import { walkNodes } from './treeUtils'
import { rulesToCode } from './validationRules'
import { responsiveRules } from './responsiveStyle'
import { addHelper, expressionToJs, HelperName } from './expressionToJs'
import { jsLiteral, jsString } from './jsLiteral'
import { chipColumnKeys, STATUS_CHIP_PROPS } from './statusChips'
import type { UiAction, UiNode } from './types'
import { bindText, bindTextForTemplate, escapeAttribute, pathToJs } from './vueBindings'

const INDENT = '  '
const LINE_LIMIT = 100
const DEFAULT_SLOT = 'default'

export interface TemplateContext extends CodeContext {
  /** Names of variables; a word that is not one next to `==` is read as text. */
  known: ReadonlySet<string>
  /** Style rules the template needs, for elements that look different on smaller screens. */
  styles: Set<string>
  /** The forms whose reset needs a function in the script. */
  forms: ExportedForm[]
}

export interface ExportedForm {
  /** Name of the template ref on the form. */
  ref: string
  resetName: string
  variables: string[]
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

const attribute = (name: string, code: string) => `${name}="${escapeAttribute(code)}"`

/** The actions as statements. Like Preview, an action that is not finished does nothing. */
const statementsOf = (actions: UiAction[], context: TemplateContext): string[] =>
  actions
    .filter(action => !lacksVariable(action))
    .map(action => actionToCode(action, context))
    .filter(Boolean)

/** A handler with an argument; several statements need a block. */
const arrow = (argument: string, statements: string[]) =>
  statements.length === 1 ? `${argument} => ${statements[0]}` : `${argument} => { ${statements.join('; ')} }`

function clickAttributes(node: UiNode, context: TemplateContext): string[] {
  const actions = actionsOf(node.events, EventName.Click)
  if (!actions.length) return []
  const statements = statementsOf(actions, context)
  // A table row hands over its row as `item`; elsewhere the click must not also reach the row.
  if (clickEventOf(node.type) === ClickEvent.Row)
    return statements.length ? [attribute(`@${ClickEvent.Row}`, arrow('(_, { item })', statements))] : []
  // An element's click does not reach the row around it, even when none of its actions is finished.
  const name = `@${ClickEvent.Element}.stop`
  return statements.length ? [attribute(name, statements.join('; '))] : [name]
}

function submitAttributes(node: UiNode, context: TemplateContext): string[] {
  if (!isForm(node)) return []
  const statements = statementsOf(actionsOf(node.events, EventName.Submit), context)
  // Without `.prevent` the browser would reload the page.
  if (!statements.length) return ['@submit.prevent']
  const guarded = ['if (!(await event).valid) return', ...statements]
  return [attribute('@submit.prevent', `async event => { ${guarded.join('; ')} }`)]
}

function mountedAttributes(node: UiNode, context: TemplateContext): string[] {
  const statements = statementsOf(actionsOf(node.events, EventName.Mounted), context)
  return statements.length ? [attribute('@vue:mounted', statements.join('; '))] : []
}

const eventAttributes = (node: UiNode, context: TemplateContext): string[] => [
  ...clickAttributes(node, context),
  ...submitAttributes(node, context),
  ...mountedAttributes(node, context),
]

/**
 * The link to a variable and the change actions. A masked input formats what is typed before it reaches the
 * variable, as in Preview, and the actions then see the formatted value.
 */
function modelAttributes(node: UiNode, context: TemplateContext): string[] {
  const changes = statementsOf(actionsOf(node.events, EventName.Change), context)
  const { mask } = node.props
  const masked = !!node.model && typeof mask === 'string' && !!mask
  const onChange = changes.length ? [attribute('@update:model-value', arrow('value', changes))] : []
  if (!node.model) return onChange
  if (!masked) return [`v-model="${node.model}"`, ...onChange]

  addHelper(context.helpers, HelperName.ApplyInputMask)
  const bound = bindText(mask as string)
  const maskCode = bound.dynamic ? bound.code : jsString(mask as string)
  const assign = `${node.model} = applyInputMask($event, ${maskCode})`
  const handler = changes.length
    ? `input => { const value = applyInputMask(input, ${maskCode}); ${[`${node.model} = value`, ...changes].join('; ')} }`
    : assign
  return [`:model-value="${node.model}"`, attribute('@update:model-value', handler)]
}

function rulesAttributes(node: UiNode, context: TemplateContext): string[] {
  const code = rulesToCode(node.rules, context.helpers)
  return code ? [attribute(':rules', code)] : []
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

/** Writes an element while the form it starts, if any, is the one that "reset the form" means. */
function renderElement(node: UiNode, context: TemplateContext, depth: number, withRepeat: boolean): string[] {
  if (!isForm(node) || !resetsForm(node)) return renderTag(node, context, depth, withRepeat)
  const number = context.forms.length + 1
  const form = { ref: `form${number}`, resetName: `resetForm${number}`, variables: formVariables(node) }
  context.forms.push(form)
  const outer = context.resetFormCall
  context.resetFormCall = `${form.resetName}()`
  const lines = renderTag(node, context, depth, withRepeat, [`ref="${form.ref}"`])
  context.resetFormCall = outer
  return lines
}

const resetsForm = (form: UiNode) =>
  [...walkNodes(form)].some(node =>
    eventEntries(node.events).some(([, actions]) => actions.some(action => action.type === ActionType.ResetForm)),
  )

function renderTag(
  node: UiNode,
  context: TemplateContext,
  depth: number,
  withRepeat: boolean,
  extra: string[] = [],
): string[] {
  const pad = INDENT.repeat(depth)
  const attributes = [
    ...extra,
    ...(withRepeat ? repeatAttributes(node) : []),
    ...conditionAttributes(node, context),
    ...modelAttributes(node, context),
    ...rulesAttributes(node, context),
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
