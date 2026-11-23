import { TEXT_NODE_TYPE, FieldKind, type PropField, type PropertySection, type UiNode } from '../../../entities/ui-node'

export enum InspectorTab {
  Content = 'content',
  Layout = 'layout',
  Appearance = 'appearance',
  Advanced = 'advanced',
  /** The element's properties as editable JSON. */
  Json = 'json',
  /** Figma-style controls; they write the element's own style rather than classes. */
  Design = 'design',
}

export interface InspectorTabDefinition {
  id: InspectorTab
  label: string
  icon: string
}

/** The groups of the inspector in the order of its vertical tab rail. */
export const INSPECTOR_TABS: InspectorTabDefinition[] = [
  { id: InspectorTab.Content, label: 'Content', icon: 'mdi-text-box-outline' },
  { id: InspectorTab.Layout, label: 'Layout', icon: 'mdi-view-dashboard-outline' },
  { id: InspectorTab.Appearance, label: 'Style', icon: 'mdi-palette-outline' },
  { id: InspectorTab.Advanced, label: 'Advanced', icon: 'mdi-tune-variant' },
  { id: InspectorTab.Json, label: 'JSON', icon: 'mdi-code-json' },
  { id: InspectorTab.Design, label: 'Design', icon: 'mdi-vector-square' },
]

/**
 * The tabs that make sense for an element. A text element keeps its text in its name and has no properties
 * or style of its own, so the JSON and Design tabs would only be empty.
 */
export function inspectorTabsFor(node: UiNode | null, designEnabled: boolean): InspectorTabDefinition[] {
  const isText = node?.type === TEXT_NODE_TYPE
  return INSPECTOR_TABS.filter(tab => {
    if (tab.id === InspectorTab.Design) return designEnabled && !isText
    if (tab.id === InspectorTab.Json) return !isText
    return true
  })
}

const CONTENT_PROPS = ['title', 'subtitle', 'label', 'placeholder', 'hint', 'src', 'alt', 'image', 'value']
const LAYOUT_KINDS = [FieldKind.Spacing, FieldKind.FlexLayout, FieldKind.Row]
const LAYOUT_SECTIONS = ['Layout', 'Grid Column']

/** The inspector tab a setting belongs to. */
export function fieldTab(field: PropField, sectionTitle: string): InspectorTab {
  if (field.kind === FieldKind.CustomClasses) return InspectorTab.Advanced
  if (field.kind === FieldKind.TableEditor) return InspectorTab.Content
  if (LAYOUT_KINDS.includes(field.kind) || LAYOUT_SECTIONS.includes(sectionTitle)) return InspectorTab.Layout
  if (field.kind === FieldKind.Textarea || (field.kind === FieldKind.Text && CONTENT_PROPS.includes(field.prop)))
    return InspectorTab.Content
  return InspectorTab.Appearance
}

/** The groups of settings of one tab, without the empty ones. */
export function sectionsForTab(sections: PropertySection[], tab: InspectorTab): PropertySection[] {
  return sections
    .map(section => ({
      ...section,
      fields: section.fields.filter(
        field => field.kind !== FieldKind.CustomClasses && fieldTab(field, section.title ?? '') === tab,
      ),
    }))
    .filter(section => section.fields.length)
}

/** The tab to open for a newly selected element: its content if it has any, else layout, else style. */
export function defaultTab(node: UiNode | null, sections: PropertySection[]): InspectorTab {
  const has = (tab: InspectorTab) => sections.some(s => s.fields.some(f => fieldTab(f, s.title ?? '') === tab))
  if (node?.children.some(child => child.type === TEXT_NODE_TYPE) || has(InspectorTab.Content))
    return InspectorTab.Content
  return has(InspectorTab.Layout) ? InspectorTab.Layout : InspectorTab.Appearance
}
