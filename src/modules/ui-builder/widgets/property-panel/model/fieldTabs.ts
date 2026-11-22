import { TEXT_NODE_TYPE, FieldKind, type PropField, type PropertySection, type UiNode } from '../../../entities/ui-node'

export enum InspectorTab {
  Content = 'content',
  Layout = 'layout',
  Appearance = 'appearance',
  Advanced = 'advanced',
  /** Figma-style controls; they write the element's own style rather than classes. */
  Design = 'design',
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
