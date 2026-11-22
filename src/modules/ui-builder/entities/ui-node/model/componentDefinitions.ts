import type { ComponentType } from './types'

export type PropField =
  | { kind: 'text'; prop: string; label: string; placeholder?: string; clearable?: boolean }
  | { kind: 'textarea'; label: string }
  | { kind: 'select'; prop: string; label: string; options: string[] }
  | { kind: 'switch'; prop: string; label: string }
  | { kind: 'icon-picker'; prop: string; label: string }
  | { kind: 'table-editor' }
  | { kind: 'json'; prop: string; label: string }
  | { kind: 'slider'; prop: string; label: string; min: number; max: number; step?: number }
  | { kind: 'row'; fields: Array<{ prop: string; label: string; placeholder?: string }> }
  | { kind: 'icon-slots'; slots: Array<{ prop: string; label: string }> }
  | { kind: 'spacing'; withPadding?: boolean }
  | { kind: 'flex-layout' }
  | { kind: 'typography' }
  | { kind: 'custom-classes' }

export interface PropertySection {
  title?: string
  fields: PropField[]
}

export interface DefaultChildDefinition {
  type: string
  name?: string
  props?: Record<string, unknown>
}

export interface ComponentDef {
  type: string
  label: string
  treeIcon: string
  isLeaf?: boolean
  isWrapContainer?: boolean
  slots: { name: string; label: string }[]
  defaultProps: Record<string, unknown>
  defaultClasses: string[]
  defaultTextChild?: boolean
  defaultChildren?: Array<string | DefaultChildDefinition>
  showInPalette: boolean
  propertySections: PropertySection[]
}

export const COMPONENT_CATEGORY_ORDER = [
  'Layout',
  'Content',
  'Actions',
  'Forms',
  'Navigation',
  'Lists & data',
  'Feedback',
  'Media',
  'Utility',
  'Other',
] as const
export type ComponentCategory = (typeof COMPONENT_CATEGORY_ORDER)[number]

const CATEGORY_BY_TYPE: Record<string, ComponentCategory> = {
  div: 'Layout',
  VRow: 'Layout',
  VCol: 'Layout',
  VContainer: 'Layout',
  VSheet: 'Layout',
  VSpacer: 'Layout',
  VBtnGroup: 'Layout',
  VCard: 'Content',
  VCardTitle: 'Content',
  VCardText: 'Content',
  VToolbar: 'Content',
  VBtn: 'Actions',
  VForm: 'Forms',
  VTextField: 'Forms',
  VTextarea: 'Forms',
  VAutocomplete: 'Forms',
  VFileInput: 'Forms',
  VCheckbox: 'Forms',
  VSwitch: 'Forms',
  VSelect: 'Forms',
  VSlider: 'Forms',
  VRadioGroup: 'Forms',
  VTabs: 'Navigation',
  VExpansionPanels: 'Navigation',
  VAlert: 'Feedback',
  VChip: 'Feedback',
  VAvatar: 'Feedback',
  VBadge: 'Feedback',
  VProgressCircular: 'Feedback',
  VProgressLinear: 'Feedback',
  VIcon: 'Media',
  VImg: 'Media',
  VList: 'Lists & data',
  VListItem: 'Lists & data',
  VDivider: 'Utility',
  VApp: 'Layout',
  VMain: 'Layout',
  VAppBar: 'Layout',
  VNavigationDrawer: 'Layout',
  PageOutlet: 'Layout',
  VDataTable: 'Lists & data',
  VPagination: 'Lists & data',
  VTimeline: 'Lists & data',
  VTimelineItem: 'Lists & data',
  VDialog: 'Feedback',
  VMenu: 'Feedback',
  VSnackbar: 'Feedback',
  VTooltip: 'Feedback',
  VSkeletonLoader: 'Feedback',
  VDatePicker: 'Forms',
  VBtnToggle: 'Actions',
  VBreadcrumbs: 'Navigation',
  VStepper: 'Navigation',
}

export const getComponentCategory = (type: string): ComponentCategory => CATEGORY_BY_TYPE[type] ?? 'Other'

function def(config: Omit<ComponentDef, 'propertySections'>) {
  const sections: PropertySection[] = []

  const builder = {
    section(title: string, fields: PropField[]) {
      sections.push({ title, fields })
      return builder
    },
    spacing(withPadding = false) {
      sections.push({ title: 'Spacing', fields: [{ kind: 'spacing', withPadding }] })
      return builder
    },
    typography() {
      sections.push({ title: 'Typography', fields: [{ kind: 'typography' }] })
      return builder
    },
    classes() {
      sections.push({ title: 'Custom Classes', fields: [{ kind: 'custom-classes' }] })
      return builder
    },
    build(): ComponentDef {
      return { ...config, propertySections: sections }
    },
  }

  return builder
}

const VARIANTS = ['elevated', 'flat', 'tonal', 'outlined', 'text', 'plain']
const COLORS = [
  'primary',
  'secondary',
  'success',
  'info',
  'warning',
  'error',
  'white',
  'transparent',
  'surface',
  'background',
]
const ICON_SIZES = ['x-small', 'small', 'default', 'large', 'x-large']
const ALERT_TYPES = ['success', 'info', 'warning', 'error']

export const COMPONENT_DEFS: Record<string, ComponentDef> = {
  div: def({
    type: 'div',
    label: 'Box (div)',
    treeIcon: 'mdi-xml',
    isWrapContainer: true,
    slots: [{ name: 'default', label: 'Default Content' }],
    defaultProps: {},
    defaultClasses: ['d-block'],
    showInPalette: true,
  })
    .section('Display & Layout', [{ kind: 'flex-layout' }])
    .spacing()
    .classes()
    .build(),

  VCard: def({
    type: 'VCard',
    label: 'Card',
    treeIcon: 'mdi-card-outline',
    isWrapContainer: true,
    slots: [
      { name: 'default', label: 'Default' },
      { name: 'title', label: 'Title' },
      { name: 'subtitle', label: 'Subtitle' },
      { name: 'text', label: 'Text' },
      { name: 'actions', label: 'Actions' },
      { name: 'prepend', label: 'Prepend' },
      { name: 'append', label: 'Append' },
    ],
    defaultProps: {},
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Appearance', [
      { kind: 'select', prop: 'variant', label: 'Variant', options: VARIANTS },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      { kind: 'switch', prop: 'hover', label: 'Hover effect' },
    ])
    .spacing(true)
    .classes()
    .build(),

  VCardTitle: def({
    type: 'VCardTitle',
    label: 'Card Title',
    treeIcon: 'mdi-format-header-1',
    slots: [{ name: 'default', label: 'Default' }],
    defaultProps: {},
    defaultClasses: [],
    defaultTextChild: true,
    showInPalette: true,
  })
    .typography()
    .spacing()
    .classes()
    .build(),

  VCardText: def({
    type: 'VCardText',
    label: 'Card Text',
    treeIcon: 'mdi-text-box-outline',
    slots: [{ name: 'default', label: 'Default' }],
    defaultProps: {},
    defaultClasses: [],
    defaultTextChild: true,
    showInPalette: true,
  })
    .typography()
    .spacing()
    .classes()
    .build(),

  VBtn: def({
    type: 'VBtn',
    label: 'Button',
    treeIcon: 'mdi-rectangle-outline',
    slots: [
      { name: 'default', label: 'Default' },
      { name: 'prepend', label: 'Prepend' },
      { name: 'append', label: 'Append' },
    ],
    defaultProps: {},
    defaultClasses: [],
    defaultTextChild: true,
    showInPalette: true,
  })
    .section('Appearance', [
      { kind: 'select', prop: 'variant', label: 'Variant', options: VARIANTS },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      { kind: 'select', prop: 'size', label: 'Size', options: ICON_SIZES },
      { kind: 'switch', prop: 'block', label: 'Block (full width)' },
      { kind: 'switch', prop: 'rounded', label: 'Rounded' },
      { kind: 'switch', prop: 'icon', label: 'Icon Button' },
      { kind: 'text', prop: 'value', label: 'Value (for button toggle)' },
    ])
    .section('Icons', [
      {
        kind: 'icon-slots',
        slots: [
          { prop: 'prependIcon', label: 'Prepend Icon' },
          { prop: 'appendIcon', label: 'Append Icon' },
        ],
      },
    ])
    .typography()
    .spacing()
    .classes()
    .build(),

  VTextField: def({
    type: 'VTextField',
    label: 'Input Field',
    treeIcon: 'mdi-form-textbox',
    slots: [
      { name: 'prepend', label: 'Prepend' },
      { name: 'append', label: 'Append' },
      { name: 'prepend-inner', label: 'Prepend Inner' },
      { name: 'append-inner', label: 'Append Inner' },
    ],
    defaultProps: {},
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Field', [
      { kind: 'text', prop: 'label', label: 'Label', placeholder: 'Field label' },
      { kind: 'text', prop: 'placeholder', label: 'Placeholder' },
      { kind: 'text', prop: 'hint', label: 'Hint text' },
      { kind: 'select', prop: 'type', label: 'Type', options: ['text', 'password', 'number', 'email', 'tel', 'url'] },
      {
        kind: 'select',
        prop: 'variant',
        label: 'Variant',
        options: ['underlined', 'outlined', 'filled', 'solo', 'plain'],
      },
      { kind: 'text', prop: 'mask', label: 'Mask', placeholder: '##.##.#### ( # digit, A letter )' },
      { kind: 'switch', prop: 'clearable', label: 'Clearable' },
      { kind: 'switch', prop: 'readonly', label: 'Readonly' },
      { kind: 'switch', prop: 'disabled', label: 'Disabled' },
    ])
    .section('Icons', [
      {
        kind: 'icon-slots',
        slots: [
          { prop: 'prependIcon', label: 'Prepend Icon' },
          { prop: 'appendIcon', label: 'Append Icon' },
          { prop: 'prependInnerIcon', label: 'Prepend Inner' },
          { prop: 'appendInnerIcon', label: 'Append Inner' },
        ],
      },
    ])
    .spacing()
    .classes()
    .build(),

  VForm: def({
    type: 'VForm',
    label: 'Form',
    treeIcon: 'mdi-form-select',
    isWrapContainer: true,
    slots: [{ name: 'default', label: 'Fields' }],
    defaultProps: { disabled: false },
    defaultClasses: [],
    defaultChildren: [
      { type: 'VTextField', name: 'Name', props: { label: 'Name' } },
      { type: 'VTextField', name: 'Email', props: { label: 'Email', type: 'email' } },
      { type: 'VBtn', name: 'Submit', props: { color: 'primary' } },
    ],
    showInPalette: true,
  })
    .section('Form', [{ kind: 'switch', prop: 'disabled', label: 'Disabled' }])
    .spacing()
    .classes()
    .build(),

  VTextarea: def({
    type: 'VTextarea',
    label: 'Textarea',
    treeIcon: 'mdi-text-box-multiple-outline',
    isLeaf: true,
    slots: [],
    defaultProps: { label: 'Message', rows: 3, variant: 'outlined' },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Field', [
      { kind: 'text', prop: 'label', label: 'Label', placeholder: 'Field label' },
      { kind: 'text', prop: 'placeholder', label: 'Placeholder' },
      {
        kind: 'select',
        prop: 'variant',
        label: 'Variant',
        options: ['underlined', 'outlined', 'filled', 'solo', 'plain'],
      },
      { kind: 'slider', prop: 'rows', label: 'Rows', min: 1, max: 10, step: 1 },
      { kind: 'switch', prop: 'clearable', label: 'Clearable' },
      { kind: 'switch', prop: 'disabled', label: 'Disabled' },
    ])
    .spacing()
    .classes()
    .build(),

  VCheckbox: def({
    type: 'VCheckbox',
    label: 'Checkbox',
    treeIcon: 'mdi-checkbox-marked-outline',
    isLeaf: true,
    slots: [],
    defaultProps: { label: 'Accept terms', modelValue: false, color: 'primary' },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Field', [
      { kind: 'text', prop: 'label', label: 'Label', placeholder: 'Checkbox label' },
      { kind: 'switch', prop: 'modelValue', label: 'Checked' },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      { kind: 'switch', prop: 'disabled', label: 'Disabled' },
    ])
    .spacing()
    .classes()
    .build(),

  VSwitch: def({
    type: 'VSwitch',
    label: 'Switch',
    treeIcon: 'mdi-toggle-switch-outline',
    isLeaf: true,
    slots: [],
    defaultProps: { label: 'Enabled', modelValue: true, color: 'primary' },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Field', [
      { kind: 'text', prop: 'label', label: 'Label', placeholder: 'Switch label' },
      { kind: 'switch', prop: 'modelValue', label: 'On' },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      { kind: 'switch', prop: 'inset', label: 'Inset' },
      { kind: 'switch', prop: 'disabled', label: 'Disabled' },
    ])
    .spacing()
    .classes()
    .build(),

  VSelect: def({
    type: 'VSelect',
    label: 'Select',
    treeIcon: 'mdi-form-select',
    isLeaf: true,
    slots: [],
    defaultProps: { label: 'Choose an option', items: ['Option 1', 'Option 2'], variant: 'outlined' },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Field', [
      { kind: 'text', prop: 'label', label: 'Label', placeholder: 'Select label' },
      {
        kind: 'select',
        prop: 'variant',
        label: 'Variant',
        options: ['underlined', 'outlined', 'filled', 'solo', 'plain'],
      },
      { kind: 'switch', prop: 'clearable', label: 'Clearable' },
      { kind: 'switch', prop: 'multiple', label: 'Multiple' },
      { kind: 'switch', prop: 'disabled', label: 'Disabled' },
    ])
    .spacing()
    .classes()
    .build(),

  VAutocomplete: def({
    type: 'VAutocomplete',
    label: 'Autocomplete',
    treeIcon: 'mdi-text-search',
    isLeaf: true,
    slots: [],
    defaultProps: { label: 'Search', items: ['Option 1', 'Option 2', 'Option 3'], variant: 'outlined' },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Field', [
      { kind: 'text', prop: 'label', label: 'Label', placeholder: 'Search label' },
      {
        kind: 'select',
        prop: 'variant',
        label: 'Variant',
        options: ['underlined', 'outlined', 'filled', 'solo', 'plain'],
      },
      { kind: 'switch', prop: 'clearable', label: 'Clearable' },
      { kind: 'switch', prop: 'chips', label: 'Show chips' },
      { kind: 'switch', prop: 'multiple', label: 'Multiple' },
      { kind: 'switch', prop: 'disabled', label: 'Disabled' },
    ])
    .spacing()
    .classes()
    .build(),

  VFileInput: def({
    type: 'VFileInput',
    label: 'File Input',
    treeIcon: 'mdi-file-upload-outline',
    isLeaf: true,
    slots: [],
    defaultProps: { label: 'Upload file', variant: 'outlined', showSize: true },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Field', [
      { kind: 'text', prop: 'label', label: 'Label', placeholder: 'Upload label' },
      { kind: 'text', prop: 'accept', label: 'Accepted types', placeholder: 'image/*,.pdf' },
      {
        kind: 'select',
        prop: 'variant',
        label: 'Variant',
        options: ['underlined', 'outlined', 'filled', 'solo', 'plain'],
      },
      { kind: 'switch', prop: 'showSize', label: 'Show file size' },
      { kind: 'switch', prop: 'multiple', label: 'Multiple files' },
      { kind: 'switch', prop: 'clearable', label: 'Clearable' },
      { kind: 'switch', prop: 'disabled', label: 'Disabled' },
    ])
    .spacing()
    .classes()
    .build(),

  VSlider: def({
    type: 'VSlider',
    label: 'Slider',
    treeIcon: 'mdi-tune-vertical-variant',
    isLeaf: true,
    slots: [],
    defaultProps: { modelValue: 50, min: 0, max: 100, step: 1, thumbLabel: true, color: 'primary' },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Slider', [
      { kind: 'slider', prop: 'modelValue', label: 'Value', min: 0, max: 100, step: 1 },
      { kind: 'slider', prop: 'min', label: 'Minimum', min: 0, max: 100, step: 1 },
      { kind: 'slider', prop: 'max', label: 'Maximum', min: 1, max: 200, step: 1 },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      { kind: 'switch', prop: 'thumbLabel', label: 'Show value' },
      { kind: 'switch', prop: 'disabled', label: 'Disabled' },
    ])
    .spacing()
    .classes()
    .build(),

  VRadioGroup: def({
    type: 'VRadioGroup',
    label: 'Radio Group',
    treeIcon: 'mdi-radiobox-marked',
    isWrapContainer: true,
    slots: [{ name: 'default', label: 'Options' }],
    defaultProps: { modelValue: 'option-1', label: 'Choose one', color: 'primary' },
    defaultClasses: [],
    defaultChildren: [
      { type: 'VRadio', name: 'Option 1', props: { value: 'option-1' } },
      { type: 'VRadio', name: 'Option 2', props: { value: 'option-2' } },
    ],
    showInPalette: true,
  })
    .section('Group', [
      { kind: 'text', prop: 'label', label: 'Label', placeholder: 'Choose one' },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      { kind: 'switch', prop: 'inline', label: 'Inline options' },
      { kind: 'switch', prop: 'disabled', label: 'Disabled' },
    ])
    .spacing()
    .classes()
    .build(),

  VRadio: def({
    type: 'VRadio',
    label: 'Radio',
    treeIcon: 'mdi-radiobox-blank',
    slots: [{ name: 'default', label: 'Label' }],
    defaultProps: { value: 'option' },
    defaultClasses: [],
    defaultTextChild: true,
    showInPalette: false,
  })
    .section('Option', [
      { kind: 'text', prop: 'label', label: 'Label', placeholder: 'Option' },
      { kind: 'text', prop: 'value', label: 'Value', placeholder: 'option' },
    ])
    .classes()
    .build(),

  VContainer: def({
    type: 'VContainer',
    label: 'Container',
    treeIcon: 'mdi-view-dashboard-outline',
    isWrapContainer: true,
    slots: [{ name: 'default', label: 'Default' }],
    defaultProps: { fluid: false },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Layout', [{ kind: 'switch', prop: 'fluid', label: 'Fluid width' }])
    .spacing()
    .classes()
    .build(),

  VSheet: def({
    type: 'VSheet',
    label: 'Surface',
    treeIcon: 'mdi-square-rounded-outline',
    isWrapContainer: true,
    slots: [{ name: 'default', label: 'Default' }],
    defaultProps: { rounded: 'lg', elevation: 1 },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Appearance', [
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      { kind: 'select', prop: 'rounded', label: 'Rounded', options: ['0', 'sm', 'md', 'lg', 'xl', 'pill'] },
      { kind: 'slider', prop: 'elevation', label: 'Elevation', min: 0, max: 24, step: 1 },
    ])
    .spacing()
    .classes()
    .build(),

  VToolbar: def({
    type: 'VToolbar',
    label: 'Toolbar',
    treeIcon: 'mdi-dock-top',
    isWrapContainer: true,
    slots: [
      { name: 'default', label: 'Default' },
      { name: 'title', label: 'Title' },
      { name: 'prepend', label: 'Prepend' },
      { name: 'append', label: 'Append' },
    ],
    defaultProps: { title: 'Toolbar', color: 'surface', density: 'default' },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Toolbar', [
      { kind: 'text', prop: 'title', label: 'Title', placeholder: 'Toolbar title' },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      { kind: 'select', prop: 'density', label: 'Density', options: ['default', 'comfortable', 'compact'] },
      { kind: 'switch', prop: 'flat', label: 'Flat' },
    ])
    .spacing()
    .classes()
    .build(),

  VList: def({
    type: 'VList',
    label: 'List',
    treeIcon: 'mdi-format-list-bulleted',
    isWrapContainer: true,
    slots: [
      { name: 'default', label: 'Default' },
      { name: 'subheader', label: 'Subheader' },
      { name: 'prepend', label: 'Prepend' },
      { name: 'append', label: 'Append' },
    ],
    defaultProps: {},
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Appearance', [
      { kind: 'select', prop: 'variant', label: 'Variant', options: VARIANTS },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      { kind: 'select', prop: 'lines', label: 'Multi-line', options: ['one', 'two', 'three'] },
    ])
    .spacing(true)
    .classes()
    .build(),

  VListItem: def({
    type: 'VListItem',
    label: 'List Item',
    treeIcon: 'mdi-order-bool-ascending-variant',
    slots: [
      { name: 'default', label: 'Default' },
      { name: 'title', label: 'Title' },
      { name: 'subtitle', label: 'Subtitle' },
      { name: 'prepend', label: 'Prepend' },
      { name: 'append', label: 'Append' },
    ],
    defaultProps: {},
    defaultClasses: [],
    defaultTextChild: true,
    showInPalette: true,
  })
    .section('Appearance', [
      { kind: 'text', prop: 'title', label: 'Title' },
      { kind: 'text', prop: 'subtitle', label: 'Subtitle' },
      { kind: 'select', prop: 'variant', label: 'Variant', options: VARIANTS },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
    ])
    .section('Icons', [
      {
        kind: 'icon-slots',
        slots: [
          { prop: 'prependIcon', label: 'Prepend Icon' },
          { prop: 'appendIcon', label: 'Append Icon' },
        ],
      },
    ])
    .typography()
    .spacing(true)
    .classes()
    .build(),

  VRow: def({
    type: 'VRow',
    label: 'Row',
    treeIcon: 'mdi-view-sequential-outline',
    isWrapContainer: true,
    slots: [{ name: 'default', label: 'Default' }],
    defaultProps: {},
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Layout', [
      {
        kind: 'select',
        prop: 'justify',
        label: 'Justify',
        options: ['start', 'center', 'end', 'space-around', 'space-between'],
      },
      { kind: 'select', prop: 'align', label: 'Align', options: ['start', 'center', 'end', 'stretch', 'baseline'] },
      { kind: 'switch', prop: 'noGutters', label: 'No Gutters' },
      { kind: 'switch', prop: 'dense', label: 'Dense' },
    ])
    .spacing()
    .classes()
    .build(),

  VCol: def({
    type: 'VCol',
    label: 'Col',
    treeIcon: 'mdi-view-column-outline',
    isWrapContainer: true,
    slots: [{ name: 'default', label: 'Default' }],
    defaultProps: { cols: 12 },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Grid Column', [
      { kind: 'slider', prop: 'cols', label: 'Width (cols)', min: 1, max: 12, step: 1 },
      { kind: 'slider', prop: 'sm', label: 'Width SM', min: 1, max: 12, step: 1 },
      { kind: 'slider', prop: 'md', label: 'Width MD', min: 1, max: 12, step: 1 },
      { kind: 'slider', prop: 'lg', label: 'Width LG', min: 1, max: 12, step: 1 },
    ])
    .spacing(true)
    .classes()
    .build(),

  VIcon: def({
    type: 'VIcon',
    label: 'Icon',
    treeIcon: 'mdi-star-circle-outline',
    isLeaf: true,
    slots: [],
    defaultProps: { icon: 'mdi-star', size: 'default' },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Icon', [
      { kind: 'icon-picker', prop: 'icon', label: 'Icon' },
      { kind: 'select', prop: 'size', label: 'Size', options: ICON_SIZES },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
    ])
    .spacing()
    .classes()
    .build(),

  VImg: def({
    type: 'VImg',
    label: 'Image',
    treeIcon: 'mdi-image-outline',
    isLeaf: true,
    slots: [
      { name: 'default', label: 'Default' },
      { name: 'placeholder', label: 'Placeholder' },
    ],
    defaultProps: { src: '', alt: '', width: '100%', height: '200', cover: false },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Image', [
      { kind: 'text', prop: 'src', label: 'Source URL', placeholder: 'https://...', clearable: true },
      { kind: 'text', prop: 'alt', label: 'Alt text' },
      {
        kind: 'row',
        fields: [
          { prop: 'width', label: 'Width', placeholder: '100%' },
          { prop: 'height', label: 'Height', placeholder: '200' },
        ],
      },
      { kind: 'switch', prop: 'cover', label: 'Cover (object-fit)' },
      { kind: 'switch', prop: 'rounded', label: 'Rounded' },
    ])
    .spacing()
    .classes()
    .build(),

  VDivider: def({
    type: 'VDivider',
    label: 'Divider',
    treeIcon: 'mdi-minus',
    isLeaf: true,
    slots: [],
    defaultProps: {},
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Divider', [
      { kind: 'slider', prop: 'thickness', label: 'Thickness', min: 1, max: 8, step: 1 },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      { kind: 'switch', prop: 'vertical', label: 'Vertical' },
      { kind: 'switch', prop: 'inset', label: 'Inset' },
    ])
    .spacing()
    .classes()
    .build(),

  VAlert: def({
    type: 'VAlert',
    label: 'Alert',
    treeIcon: 'mdi-alert-circle-outline',
    slots: [
      { name: 'default', label: 'Default' },
      { name: 'title', label: 'Title' },
      { name: 'prepend', label: 'Prepend' },
      { name: 'append', label: 'Append' },
    ],
    defaultProps: { type: 'info', variant: 'flat' },
    defaultClasses: [],
    defaultTextChild: true,
    showInPalette: true,
  })
    .section('Alert Properties', [
      { kind: 'select', prop: 'type', label: 'Type', options: ALERT_TYPES },
      { kind: 'select', prop: 'variant', label: 'Variant', options: VARIANTS },
      { kind: 'text', prop: 'title', label: 'Title', placeholder: 'Alert title' },
      { kind: 'switch', prop: 'closable', label: 'Closable' },
      { kind: 'switch', prop: 'prominent', label: 'Prominent' },
    ])
    .typography()
    .spacing()
    .classes()
    .build(),

  VChip: def({
    type: 'VChip',
    label: 'Chip',
    treeIcon: 'mdi-label-outline',
    slots: [
      { name: 'default', label: 'Default' },
      { name: 'prepend', label: 'Prepend' },
      { name: 'append', label: 'Append' },
    ],
    defaultProps: { variant: 'elevated' },
    defaultClasses: [],
    defaultTextChild: true,
    showInPalette: true,
  })
    .section('Appearance', [
      { kind: 'select', prop: 'variant', label: 'Variant', options: VARIANTS },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      { kind: 'select', prop: 'size', label: 'Size', options: ICON_SIZES },
      { kind: 'switch', prop: 'closable', label: 'Closable' },
      { kind: 'switch', prop: 'pill', label: 'Pill' },
    ])
    .section('Icons', [
      {
        kind: 'icon-slots',
        slots: [
          { prop: 'prependIcon', label: 'Prepend Icon' },
          { prop: 'appendIcon', label: 'Append Icon' },
        ],
      },
    ])
    .typography()
    .spacing()
    .classes()
    .build(),

  VAvatar: def({
    type: 'VAvatar',
    label: 'Avatar',
    treeIcon: 'mdi-account-circle-outline',
    slots: [{ name: 'default', label: 'Default' }],
    defaultProps: { size: 'default' },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Appearance', [
      { kind: 'text', prop: 'image', label: 'Image URL', placeholder: 'https://...' },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      { kind: 'select', prop: 'variant', label: 'Variant', options: VARIANTS },
      { kind: 'select', prop: 'size', label: 'Size', options: ICON_SIZES },
      { kind: 'switch', prop: 'rounded', label: 'Rounded' },
    ])
    .section('Icon', [{ kind: 'icon-picker', prop: 'icon', label: 'Fallback Icon' }])
    .spacing()
    .classes()
    .build(),

  VProgressCircular: def({
    type: 'VProgressCircular',
    label: 'Progress Circular',
    treeIcon: 'mdi-progress-helper',
    slots: [{ name: 'default', label: 'Default' }],
    defaultProps: { indeterminate: true, size: 'default' },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Progress', [
      { kind: 'switch', prop: 'indeterminate', label: 'Indeterminate' },
      { kind: 'slider', prop: 'modelValue', label: 'Value', min: 0, max: 100, step: 1 },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      { kind: 'select', prop: 'size', label: 'Size', options: ICON_SIZES },
      { kind: 'slider', prop: 'width', label: 'Width', min: 1, max: 20, step: 1 },
    ])
    .spacing()
    .classes()
    .build(),

  VProgressLinear: def({
    type: 'VProgressLinear',
    label: 'Progress Linear',
    treeIcon: 'mdi-progress-upload',
    isLeaf: true,
    slots: [],
    defaultProps: { indeterminate: true, color: 'primary', height: 6 },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Progress', [
      { kind: 'switch', prop: 'indeterminate', label: 'Indeterminate' },
      { kind: 'slider', prop: 'modelValue', label: 'Value', min: 0, max: 100, step: 1 },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      { kind: 'slider', prop: 'height', label: 'Height', min: 1, max: 24, step: 1 },
      { kind: 'switch', prop: 'rounded', label: 'Rounded' },
    ])
    .spacing()
    .classes()
    .build(),

  VBadge: def({
    type: 'VBadge',
    label: 'Badge',
    treeIcon: 'mdi-numeric-1-box-outline',
    isWrapContainer: true,
    slots: [
      { name: 'default', label: 'Content' },
      { name: 'badge', label: 'Badge' },
    ],
    defaultProps: { content: 'New', color: 'error', inline: false },
    defaultClasses: [],
    defaultTextChild: true,
    showInPalette: true,
  })
    .section('Badge', [
      { kind: 'text', prop: 'content', label: 'Content', placeholder: 'New' },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      { kind: 'switch', prop: 'dot', label: 'Dot' },
      { kind: 'switch', prop: 'inline', label: 'Inline' },
    ])
    .spacing()
    .classes()
    .build(),

  VBtnGroup: def({
    type: 'VBtnGroup',
    label: 'Button Group',
    treeIcon: 'mdi-view-sequential-outline',
    isWrapContainer: true,
    slots: [{ name: 'default', label: 'Buttons' }],
    defaultProps: { divided: false, variant: 'outlined' },
    defaultClasses: [],
    defaultChildren: ['VBtn', 'VBtn'],
    showInPalette: true,
  })
    .section('Appearance', [
      { kind: 'select', prop: 'variant', label: 'Variant', options: VARIANTS },
      { kind: 'switch', prop: 'divided', label: 'Divided' },
      { kind: 'select', prop: 'direction', label: 'Direction', options: ['horizontal', 'vertical'] },
    ])
    .spacing()
    .classes()
    .build(),

  VTabs: def({
    type: 'VTabs',
    label: 'Tabs',
    treeIcon: 'mdi-tab',
    isWrapContainer: true,
    slots: [{ name: 'default', label: 'Tabs' }],
    defaultProps: { color: 'primary', grow: false },
    defaultClasses: [],
    defaultChildren: ['VTab', 'VTab'],
    showInPalette: true,
  })
    .section('Tabs', [
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      { kind: 'switch', prop: 'grow', label: 'Grow tabs' },
      { kind: 'switch', prop: 'centered', label: 'Centered' },
      { kind: 'switch', prop: 'fixedTabs', label: 'Fixed tabs' },
    ])
    .spacing()
    .classes()
    .build(),

  VTab: def({
    type: 'VTab',
    label: 'Tab',
    treeIcon: 'mdi-tab-unselected',
    slots: [{ name: 'default', label: 'Label' }],
    defaultProps: { value: 'tab' },
    defaultClasses: [],
    defaultTextChild: true,
    showInPalette: false,
  })
    .section('Tab', [
      { kind: 'text', prop: 'value', label: 'Value' },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
    ])
    .classes()
    .build(),

  VSpacer: def({
    type: 'VSpacer',
    label: 'Spacer',
    treeIcon: 'mdi-keyboard-space',
    isLeaf: true,
    slots: [],
    defaultProps: {},
    defaultClasses: [],
    showInPalette: true,
  }).build(),

  VExpansionPanels: def({
    type: 'VExpansionPanels',
    label: 'Expansion Panels',
    treeIcon: 'mdi-chevron-down-box-outline',
    isWrapContainer: true,
    slots: [{ name: 'default', label: 'Default' }],
    defaultProps: { variant: 'default' },
    defaultClasses: [],
    defaultChildren: ['VExpansionPanel'],
    showInPalette: true,
  })
    .section('Appearance', [
      { kind: 'select', prop: 'variant', label: 'Variant', options: ['default', 'accordion', 'inset', 'popout'] },
      { kind: 'switch', prop: 'multiple', label: 'Multiple' },
      { kind: 'switch', prop: 'flat', label: 'Flat' },
    ])
    .spacing()
    .classes()
    .build(),

  VExpansionPanel: def({
    type: 'VExpansionPanel',
    label: 'Expansion Panel',
    treeIcon: 'mdi-chevron-down-circle-outline',
    isWrapContainer: true,
    slots: [
      { name: 'default', label: 'Content' },
      { name: 'title', label: 'Title' },
      { name: 'text', label: 'Text' },
    ],
    defaultProps: { title: 'Panel' },
    defaultClasses: [],
    showInPalette: false,
  })
    .section('Panel', [
      { kind: 'text', prop: 'title', label: 'Title', placeholder: 'Panel title' },
      { kind: 'text', prop: 'value', label: 'Value' },
      { kind: 'switch', prop: 'eager', label: 'Eager render' },
    ])
    .spacing()
    .classes()
    .build(),

  // ─── App layout ──────────────────────────────────────────────────────────────
  VApp: def({
    type: 'VApp',
    label: 'App layout',
    treeIcon: 'mdi-application-outline',
    isWrapContainer: true,
    slots: [{ name: 'default', label: 'Default' }],
    defaultProps: {},
    defaultClasses: [],
    defaultChildren: ['VAppBar', 'VNavigationDrawer', 'VMain'],
    showInPalette: true,
  })
    .classes()
    .build(),

  VMain: def({
    type: 'VMain',
    label: 'Main content',
    treeIcon: 'mdi-page-layout-body',
    isWrapContainer: true,
    slots: [{ name: 'default', label: 'Default' }],
    defaultProps: {},
    defaultClasses: [],
    showInPalette: true,
  })
    .spacing(true)
    .classes()
    .build(),

  VAppBar: def({
    type: 'VAppBar',
    label: 'App bar',
    treeIcon: 'mdi-page-layout-header',
    isWrapContainer: true,
    slots: [
      { name: 'default', label: 'Default' },
      { name: 'prepend', label: 'Prepend' },
      { name: 'append', label: 'Append' },
      { name: 'title', label: 'Title' },
    ],
    defaultProps: { title: 'Application', absolute: true, color: 'primary' },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('App bar', [
      { kind: 'text', prop: 'title', label: 'Title' },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      {
        kind: 'select',
        prop: 'density',
        label: 'Density',
        options: ['default', 'comfortable', 'compact', 'prominent'],
      },
      { kind: 'switch', prop: 'flat', label: 'Flat' },
      { kind: 'switch', prop: 'absolute', label: 'Absolute position' },
    ])
    .classes()
    .build(),

  VNavigationDrawer: def({
    type: 'VNavigationDrawer',
    label: 'Navigation drawer',
    treeIcon: 'mdi-page-layout-sidebar-left',
    isWrapContainer: true,
    slots: [
      { name: 'default', label: 'Default' },
      { name: 'prepend', label: 'Prepend' },
      { name: 'append', label: 'Append' },
    ],
    defaultProps: { permanent: true, absolute: true, width: 240 },
    defaultClasses: [],
    defaultChildren: ['VList'],
    showInPalette: true,
  })
    .section('Drawer', [
      { kind: 'select', prop: 'location', label: 'Location', options: ['left', 'right', 'top', 'bottom'] },
      { kind: 'slider', prop: 'width', label: 'Width', min: 160, max: 400, step: 10 },
      { kind: 'switch', prop: 'rail', label: 'Rail (icons only)' },
      { kind: 'switch', prop: 'permanent', label: 'Always visible' },
      { kind: 'switch', prop: 'absolute', label: 'Absolute position' },
    ])
    .classes()
    .build(),

  // ─── Data ────────────────────────────────────────────────────────────────────
  VDataTable: def({
    type: 'VDataTable',
    label: 'Data table',
    treeIcon: 'mdi-table',
    isLeaf: true,
    slots: [],
    defaultProps: {
      headers: [
        { title: 'ID', key: 'id' },
        { title: 'Customer', key: 'customer' },
        { title: 'Status', key: 'status' },
      ],
      items: [
        { id: 1001, customer: 'Anna', status: 'Paid' },
        { id: 1002, customer: 'Ivan', status: 'Pending' },
        { id: 1003, customer: 'Olena', status: 'Shipped' },
      ],
      itemsPerPage: 5,
    },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Data', [
      { kind: 'table-editor' },
      { kind: 'text', prop: 'search', label: 'Search text', placeholder: '{{query}}' },
      { kind: 'slider', prop: 'itemsPerPage', label: 'Rows per page', min: 1, max: 50, step: 1 },
    ])
    .section('Appearance', [
      { kind: 'select', prop: 'density', label: 'Density', options: ['default', 'comfortable', 'compact'] },
      { kind: 'switch', prop: 'hover', label: 'Hover rows' },
      { kind: 'switch', prop: 'hideDefaultFooter', label: 'Hide footer' },
      { kind: 'switch', prop: 'showSelect', label: 'Row selection' },
      { kind: 'switch', prop: 'loading', label: 'Loading' },
      { kind: 'switch', prop: 'fixedHeader', label: 'Fixed header' },
      { kind: 'text', prop: 'height', label: 'Height (px, enables scroll)', placeholder: '320' },
      { kind: 'text', prop: 'noDataText', label: 'Empty text', placeholder: 'No data available' },
    ])
    .spacing()
    .classes()
    .build(),

  VPagination: def({
    type: 'VPagination',
    label: 'Pagination',
    treeIcon: 'mdi-page-last',
    isLeaf: true,
    slots: [],
    defaultProps: { length: 5, totalVisible: 5, color: 'primary' },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Pagination', [
      { kind: 'slider', prop: 'length', label: 'Pages', min: 1, max: 50, step: 1 },
      { kind: 'slider', prop: 'totalVisible', label: 'Visible', min: 1, max: 10, step: 1 },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      { kind: 'select', prop: 'variant', label: 'Variant', options: VARIANTS },
      { kind: 'select', prop: 'density', label: 'Density', options: ['default', 'comfortable', 'compact'] },
    ])
    .spacing()
    .classes()
    .build(),

  // ─── Overlays (shown inline in the editor, real overlays in preview) ─────────
  VDialog: def({
    type: 'VDialog',
    label: 'Dialog',
    treeIcon: 'mdi-window-maximize',
    isWrapContainer: true,
    slots: [
      { name: 'default', label: 'Content' },
      { name: 'activator', label: 'Activator' },
    ],
    defaultProps: { maxWidth: 500 },
    defaultClasses: [],
    defaultChildren: ['VCard'],
    showInPalette: true,
  })
    .section('Dialog', [
      { kind: 'slider', prop: 'maxWidth', label: 'Max width', min: 240, max: 1000, step: 10 },
      { kind: 'switch', prop: 'persistent', label: 'Persistent' },
      { kind: 'switch', prop: 'fullscreen', label: 'Fullscreen' },
    ])
    .classes()
    .build(),

  VMenu: def({
    type: 'VMenu',
    label: 'Menu',
    treeIcon: 'mdi-dots-vertical-circle-outline',
    isWrapContainer: true,
    slots: [
      { name: 'default', label: 'Content' },
      { name: 'activator', label: 'Activator' },
    ],
    defaultProps: { activator: 'parent' },
    defaultClasses: [],
    defaultChildren: ['VList'],
    showInPalette: true,
  })
    .section('Menu', [
      { kind: 'select', prop: 'location', label: 'Location', options: ['bottom', 'top', 'start', 'end'] },
      { kind: 'switch', prop: 'openOnHover', label: 'Open on hover' },
      { kind: 'switch', prop: 'closeOnContentClick', label: 'Close on content click' },
    ])
    .classes()
    .build(),

  VSnackbar: def({
    type: 'VSnackbar',
    label: 'Snackbar',
    treeIcon: 'mdi-message-text-outline',
    isWrapContainer: true,
    slots: [
      { name: 'default', label: 'Text' },
      { name: 'actions', label: 'Actions' },
    ],
    defaultProps: { timeout: 3000 },
    defaultClasses: [],
    defaultTextChild: true,
    showInPalette: true,
  })
    .section('Snackbar', [
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      {
        kind: 'select',
        prop: 'location',
        label: 'Location',
        options: ['bottom', 'top', 'bottom start', 'bottom end', 'top start', 'top end'],
      },
      { kind: 'slider', prop: 'timeout', label: 'Timeout (ms)', min: 1000, max: 10000, step: 500 },
    ])
    .classes()
    .build(),

  VTooltip: def({
    type: 'VTooltip',
    label: 'Tooltip',
    treeIcon: 'mdi-tooltip-text-outline',
    isLeaf: true,
    slots: [],
    defaultProps: { activator: 'parent', text: 'Tooltip', location: 'top' },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Tooltip', [
      { kind: 'text', prop: 'text', label: 'Text', placeholder: 'Tooltip' },
      { kind: 'select', prop: 'location', label: 'Location', options: ['top', 'bottom', 'start', 'end'] },
    ])
    .build(),

  // ─── Forms: dates ────────────────────────────────────────────────────────────
  VDatePicker: def({
    type: 'VDatePicker',
    label: 'Date picker',
    treeIcon: 'mdi-calendar-month-outline',
    isLeaf: true,
    slots: [],
    defaultProps: { color: 'primary', title: 'Select date' },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Date picker', [
      { kind: 'text', prop: 'title', label: 'Title' },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      { kind: 'switch', prop: 'multiple', label: 'Multiple dates' },
      { kind: 'switch', prop: 'hideHeader', label: 'Hide header' },
      { kind: 'switch', prop: 'showAdjacentMonths', label: 'Show adjacent months' },
    ])
    .spacing()
    .classes()
    .build(),

  // ─── Navigation / progress ───────────────────────────────────────────────────
  VBreadcrumbs: def({
    type: 'VBreadcrumbs',
    label: 'Breadcrumbs',
    treeIcon: 'mdi-chevron-right-box-outline',
    isLeaf: true,
    slots: [],
    defaultProps: {
      items: [
        { title: 'Home', href: '/' },
        { title: 'Orders', href: '/orders' },
        { title: 'Order', disabled: true },
      ],
      divider: '/',
    },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Breadcrumbs', [
      { kind: 'json', prop: 'items', label: 'Items (JSON or {{state}})' },
      { kind: 'text', prop: 'divider', label: 'Divider' },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
    ])
    .spacing()
    .classes()
    .build(),

  VStepper: def({
    type: 'VStepper',
    label: 'Stepper',
    treeIcon: 'mdi-stepper',
    isLeaf: true,
    slots: [],
    defaultProps: { items: ['Created', 'Paid', 'Shipped', 'Delivered'], modelValue: 2, hideActions: true, flat: true },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Stepper', [
      { kind: 'json', prop: 'items', label: 'Steps (JSON or {{state}})' },
      { kind: 'slider', prop: 'modelValue', label: 'Current step', min: 1, max: 10, step: 1 },
      { kind: 'switch', prop: 'altLabels', label: 'Labels below icons' },
      { kind: 'switch', prop: 'flat', label: 'Flat' },
    ])
    .spacing()
    .classes()
    .build(),

  VTimeline: def({
    type: 'VTimeline',
    label: 'Timeline',
    treeIcon: 'mdi-timeline-outline',
    isWrapContainer: true,
    slots: [{ name: 'default', label: 'Items' }],
    defaultProps: { side: 'end', density: 'compact' },
    defaultClasses: [],
    defaultChildren: ['VTimelineItem', 'VTimelineItem'],
    showInPalette: true,
  })
    .section('Timeline', [
      { kind: 'select', prop: 'side', label: 'Side', options: ['start', 'end'] },
      { kind: 'select', prop: 'direction', label: 'Direction', options: ['vertical', 'horizontal'] },
      { kind: 'select', prop: 'density', label: 'Density', options: ['default', 'comfortable', 'compact'] },
    ])
    .spacing()
    .classes()
    .build(),

  VTimelineItem: def({
    type: 'VTimelineItem',
    label: 'Timeline item',
    treeIcon: 'mdi-circle-medium',
    isWrapContainer: true,
    slots: [
      { name: 'default', label: 'Content' },
      { name: 'opposite', label: 'Opposite' },
      { name: 'icon', label: 'Icon' },
    ],
    defaultProps: { dotColor: 'primary', size: 'small' },
    defaultClasses: [],
    defaultTextChild: true,
    showInPalette: false,
  })
    .section('Item', [
      { kind: 'select', prop: 'dotColor', label: 'Dot color', options: COLORS },
      { kind: 'select', prop: 'size', label: 'Size', options: ICON_SIZES },
      { kind: 'icon-picker', prop: 'icon', label: 'Icon' },
    ])
    .classes()
    .build(),

  VBtnToggle: def({
    type: 'VBtnToggle',
    label: 'Button toggle',
    treeIcon: 'mdi-toggle-switch-outline',
    isWrapContainer: true,
    slots: [{ name: 'default', label: 'Buttons' }],
    defaultProps: { color: 'primary', variant: 'outlined', mandatory: true },
    defaultClasses: [],
    defaultChildren: [
      { type: 'VBtn', name: 'All', props: { value: 'all' } },
      { type: 'VBtn', name: 'Paid', props: { value: 'paid' } },
      { type: 'VBtn', name: 'Pending', props: { value: 'pending' } },
    ],
    showInPalette: true,
  })
    .section('Toggle', [
      { kind: 'select', prop: 'variant', label: 'Variant', options: VARIANTS },
      { kind: 'select', prop: 'color', label: 'Color', options: COLORS },
      { kind: 'select', prop: 'density', label: 'Density', options: ['default', 'comfortable', 'compact'] },
      { kind: 'switch', prop: 'mandatory', label: 'Always one selected' },
      { kind: 'switch', prop: 'multiple', label: 'Multiple' },
      { kind: 'switch', prop: 'divided', label: 'Divided' },
    ])
    .spacing()
    .classes()
    .build(),

  VSkeletonLoader: def({
    type: 'VSkeletonLoader',
    label: 'Skeleton loader',
    treeIcon: 'mdi-card-bulleted-outline',
    isLeaf: true,
    slots: [],
    defaultProps: { type: 'card' },
    defaultClasses: [],
    showInPalette: true,
  })
    .section('Skeleton', [
      {
        kind: 'select',
        prop: 'type',
        label: 'Type',
        options: [
          'text',
          'heading',
          'paragraph',
          'avatar',
          'button',
          'chip',
          'image',
          'card',
          'article',
          'list-item',
          'list-item-two-line',
          'table',
        ],
      },
      { kind: 'switch', prop: 'boilerplate', label: 'No animation' },
    ])
    .spacing()
    .classes()
    .build(),

  PageOutlet: def({
    type: 'PageOutlet',
    label: 'Page content',
    treeIcon: 'mdi-file-document-arrow-right-outline',
    isLeaf: true,
    slots: [],
    defaultProps: {},
    defaultClasses: [],
    showInPalette: true,
  }).build(),

  TEXT: def({
    type: 'TEXT',
    label: 'Text',
    treeIcon: 'mdi-format-text',
    isLeaf: true,
    slots: [],
    defaultProps: {},
    defaultClasses: [],
    showInPalette: false,
  })
    .section('Text Content', [{ kind: 'textarea', label: 'Text Content' }])
    .build(),
}

export const getComponentDef = (type: string): ComponentDef | undefined => COMPONENT_DEFS[type]

export const PALETTE_COMPONENTS = Object.values(COMPONENT_DEFS).filter(d => d.showInPalette)

export const WRAP_CONTAINER_TYPES = Object.values(COMPONENT_DEFS)
  .filter(d => d.isWrapContainer)
  .map(d => ({ type: d.type as ComponentType, label: d.label, icon: d.treeIcon }))

/** Cell slots of a data table are named after their column key. */
export const CELL_SLOT_PREFIX = 'item.'
export const cellSlotName = (key: string) => `${CELL_SLOT_PREFIX}${key}`

/** Slots of a node: the component's own, plus one cell slot per column of a data table. */
export function getNodeSlots(node: {
  type: string
  props: Record<string, unknown>
}): { name: string; label: string }[] {
  const base = COMPONENT_DEFS[node.type]?.slots ?? []
  if (node.type !== 'VDataTable' || !Array.isArray(node.props.headers)) return base
  const cells = (node.props.headers as Array<{ key?: unknown; title?: unknown }>)
    .filter(header => typeof header?.key === 'string' && header.key)
    .map(header => ({
      name: cellSlotName(header.key as string),
      label: `Cell: ${typeof header.title === 'string' && header.title ? header.title : header.key}`,
    }))
  return [...base, ...cells]
}

export const getComponentSlots = (type: string) =>
  COMPONENT_DEFS[type]?.slots ?? [{ name: 'default', label: 'Default' }]
