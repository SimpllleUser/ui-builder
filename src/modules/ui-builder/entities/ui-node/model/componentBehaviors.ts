/**
 * What makes some components differ from the rest, in one place. Preview, export, the audit and the editor only read
 * it, so they cannot drift apart. Everything here is data and pure functions.
 */
import { CELL_SLOT_PREFIX } from './componentDefinitions'
import { DATA_TABLE_TYPE, DIALOG_TYPE, IMAGE_TYPE, MENU_TYPE, SNACKBAR_TYPE, TOOLTIP_TYPE } from './constants'
import { ClickEvent, IssueKind, IssueSeverity } from './enums'
import { interpolate, type Scope } from './runtime'
import { resolveTableData, shownRowCount, tableHeight, tableStyleClasses } from './tableBindings'
import type { UiNode } from './types'

type Props = Record<string, unknown>

export interface ComponentProblem {
  kind: IssueKind
  severity: IssueSeverity
  /** Completes a sentence that starts with the element's name. */
  predicate: string
}

export interface TableSummary {
  columns: string[]
  rows: number
  rowsShown: number
  search: string
}

export interface ComponentBehavior {
  /** Props the editor reads itself and never hands to this component. */
  editorOnlyProps?: readonly string[]
  /** Classes that stand for editor-only props. */
  editorClasses?(props: Props): string[]
  /** Props in the form the component expects, in Preview and in exported code alike. */
  normalizeProps?(props: Props): Props
  /** What the canvas and Preview add on top; exported code keeps the bindings and has no placeholders. */
  previewProps?(props: Props, scope: Scope): Props
  /** Names a slot receives from the component, or none for a plain slot. */
  slotParams?(slotName: string): readonly string[]
  clickEvent?: ClickEvent
  /** Set for overlays: they are drawn inline in the editor, with this note on their placeholder. */
  overlayNote?(props: Props): string
  /** Slot content is added from the component's settings, not from Layers. */
  slotsAddedInInspector?: boolean
  /** Columns marked "Status chip" fill their cells with a chip, unless the cell has content of its own. */
  hasStatusChips?: boolean
  /** A stored slot that no longer exists may be dropped instead of making the document unreadable. */
  canDropStaleSlot?(slotName: string): boolean
  problems?(node: UiNode): ComponentProblem[]
  /** What Preview shows as the component's data. */
  summarize?(node: UiNode, scope: Scope): TableSummary
}

/** Props that no component receives as they are: the mask is applied by the editor, class and style are merged. */
const COMMON_EDITOR_ONLY_PROPS: readonly string[] = ['mask', 'class', 'style']
const TABLE_CELL_PARAMS: readonly string[] = ['item', 'value', 'index']
const NO_IMAGE_PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" fill="%23e0e0e0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%23999">No image</text></svg>'

const isCellSlot = (slotName: string) => slotName.startsWith(CELL_SLOT_PREFIX)
const overlayOpensInPreview = () => 'opens in preview'

function summarizeTable(node: UiNode, scope: Scope): TableSummary {
  const data = { ...node.props, ...resolveTableData(node.props, scope) }
  const rows = Array.isArray(data.items) ? data.items : []
  const headers = Array.isArray(data.headers) ? data.headers : []
  const search = String(interpolate(node.props.search ?? '', scope) ?? '')
  return {
    columns: headers.map(header => String((header as { key?: unknown }).key ?? '')),
    rows: rows.length,
    rowsShown: shownRowCount(rows, search),
    search,
  }
}

const BEHAVIORS: Readonly<Record<string, ComponentBehavior>> = {
  [DATA_TABLE_TYPE]: {
    editorOnlyProps: ['striped', 'bordered', 'headerColor'],
    editorClasses: tableStyleClasses,
    normalizeProps: props => ('height' in props ? { ...props, height: tableHeight(props.height) } : props),
    previewProps: (props, scope) => ({ ...props, ...resolveTableData(props, scope) }),
    slotParams: slotName => (isCellSlot(slotName) ? TABLE_CELL_PARAMS : []),
    clickEvent: ClickEvent.Row,
    slotsAddedInInspector: true,
    hasStatusChips: true,
    canDropStaleSlot: isCellSlot,
    problems: node =>
      Array.isArray(node.props.headers) && node.props.headers.length === 0
        ? [{ kind: IssueKind.EmptyTable, severity: IssueSeverity.Warning, predicate: 'has no columns.' }]
        : [],
    summarize: summarizeTable,
  },
  [IMAGE_TYPE]: {
    previewProps: props => (props.src ? props : { ...props, src: NO_IMAGE_PLACEHOLDER }),
  },
  [DIALOG_TYPE]: { overlayNote: overlayOpensInPreview },
  [MENU_TYPE]: { overlayNote: overlayOpensInPreview },
  [SNACKBAR_TYPE]: { overlayNote: overlayOpensInPreview },
  [TOOLTIP_TYPE]: { overlayNote: props => String(props.text ?? '') },
}

const PLAIN_COMPONENT: ComponentBehavior = {}

export const behaviorOf = (type: string): ComponentBehavior =>
  Object.hasOwn(BEHAVIORS, type) ? BEHAVIORS[type] : PLAIN_COMPONENT

export const clickEventOf = (type: string): ClickEvent => behaviorOf(type).clickEvent ?? ClickEvent.Element

/** The props a component of this type is really given: normalized, without the ones only the editor reads. */
export function componentProps(type: string, props: Props): Props {
  const { normalizeProps, editorOnlyProps = [] } = behaviorOf(type)
  const hidden = new Set([...COMMON_EDITOR_ONLY_PROPS, ...editorOnlyProps])
  return Object.fromEntries(Object.entries(normalizeProps?.(props) ?? props).filter(([key]) => !hidden.has(key)))
}
