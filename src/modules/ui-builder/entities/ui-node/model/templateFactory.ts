import { ROOT_NODE_ID, TEXT_NODE_TYPE } from './constants'
import { ActionType, TemplateKind } from './enums'
import type { UiAction, UiNode } from './types'

export interface TemplateInfo {
  kind: TemplateKind
  label: string
  description: string
  icon: string
}

/** What the empty-page screen and the command palette offer, in this order. */
export const TEMPLATES: TemplateInfo[] = [
  { kind: TemplateKind.Card, label: 'Card', description: 'Title, text and action', icon: 'mdi-card-outline' },
  { kind: TemplateKind.Form, label: 'Contact form', description: 'Fields and submit button', icon: 'mdi-form-textbox' },
  {
    kind: TemplateKind.Columns,
    label: 'Two columns',
    description: 'Responsive layout',
    icon: 'mdi-view-column-outline',
  },
  {
    kind: TemplateKind.Dashboard,
    label: 'Dashboard',
    description: 'Key numbers and a table',
    icon: 'mdi-view-dashboard-outline',
  },
  {
    kind: TemplateKind.Table,
    label: 'Table with search',
    description: 'Filter, search and details',
    icon: 'mdi-table-search',
  },
  { kind: TemplateKind.Login, label: 'Sign-in form', description: 'Fields that react in Preview', icon: 'mdi-login' },
]

export interface TemplateContext {
  createNode(type: string, name?: string): UiNode
  cloneNodeWithNewIds(node: UiNode): UiNode
  /** `prepare` runs inside the same undo step, right before the element is added. */
  appendNode(parentId: string, node: UiNode, slotName: string | null, prepare?: () => void): boolean
  /** Adds variables the project does not have yet; existing ones keep their value. */
  ensureVariables(variables: Record<string, unknown>): void
}

export function addTemplate(context: TemplateContext, kind: TemplateKind): void {
  if (kind === TemplateKind.Dashboard || kind === TemplateKind.Table || kind === TemplateKind.Login) {
    const { node, variables } = BUILDERS[kind](context)
    context.appendNode(ROOT_NODE_ID, node, null, () => context.ensureVariables(variables))
    return
  }
  const card = createCard(context, kind)

  if (kind === TemplateKind.Columns) {
    const row = context.createNode('VRow', 'Two columns')
    row.children = [1, 2].map(number => {
      const column = context.createNode('VCol', `Column ${number}`)
      column.props = { cols: 12, md: 6 }
      column.children = [context.cloneNodeWithNewIds(card)]
      return column
    })
    context.appendNode('root-canvas', row, null)
    return
  }

  context.appendNode('root-canvas', card, null)
}

function createCard(context: TemplateContext, kind: TemplateKind): UiNode {
  const card = context.createNode('VCard', kind === TemplateKind.Form ? 'Contact form' : 'Welcome card')
  card.classes = ['pa-6', 'rounded-lg']

  const title = context.createNode('VCardTitle')
  title.classes.push('text-wrap')
  title.children[0].name = kind === TemplateKind.Form ? 'Get in touch' : 'Your next idea starts here'

  const text = context.createNode('VCardText')
  text.children[0].name = 'Select an element to edit its content and appearance.'
  card.children = [title, text]

  if (kind === TemplateKind.Form) {
    for (const label of ['Name', 'Email', 'Message']) {
      const input = context.createNode('VTextField')
      input.props = { label, variant: 'outlined', type: label === 'Email' ? 'email' : 'text' }
      card.children.push(input)
    }
  }

  const button = context.createNode('VBtn')
  button.props = { color: 'primary', variant: 'flat' }
  button.children[0].name = kind === TemplateKind.Form ? 'Send message' : 'Get started'
  card.children.push(button)

  return card
}

// ─── Templates that bring their own variables and behavior ─────────────────────

interface ElementOptions {
  name?: string
  props?: Record<string, unknown>
  classes?: string[]
  /** Text of the element, for those that have a text inside (buttons, titles…). */
  text?: string
  children?: UiNode[]
  model?: string
  vIf?: string
  click?: UiAction
}

/** An element with its settings in one place, so a template reads like the page it builds. */
function element(context: TemplateContext, type: string, options: ElementOptions = {}): UiNode {
  const node = context.createNode(type, options.name)
  if (options.props) node.props = { ...node.props, ...options.props }
  if (options.classes) node.classes = options.classes
  if (options.text !== undefined) {
    const text = node.children.find(child => child.type === TEXT_NODE_TYPE)
    if (text) text.name = options.text
  }
  if (options.children) node.children = options.children
  if (options.model) node.model = options.model
  if (options.vIf) node.vIf = options.vIf
  if (options.click) node.events = { click: options.click }
  return node
}

interface Built {
  node: UiNode
  variables: Record<string, unknown>
}

const STATUS_COLUMN = { title: 'Status', key: 'status', chip: true }
const ORDERS = [
  { id: 1001, customer: 'Anna', status: 'Paid', total: 120 },
  { id: 1002, customer: 'Ivan', status: 'Pending', total: 75 },
  { id: 1003, customer: 'Olena', status: 'Shipped', total: 310 },
  { id: 1004, customer: 'Petro', status: 'Cancelled', total: 25 },
  { id: 1005, customer: 'Maria', status: 'Paid', total: 90 },
]

function buildDashboard(context: TemplateContext): Built {
  const stat = (title: string, label: string, color: string) =>
    element(context, 'VCol', {
      props: { cols: 12, md: 4 },
      children: [
        element(context, 'VCard', {
          name: label,
          props: { variant: 'tonal', color },
          classes: ['pa-2'],
          children: [
            element(context, 'VCardTitle', { text: title, classes: ['text-h4'] }),
            element(context, 'VCardText', { text: label }),
          ],
        }),
      ],
    })
  const orders = element(context, 'VCard', {
    name: 'Recent orders',
    props: { variant: 'outlined' },
    classes: ['mt-4', 'pa-2'],
    children: [
      element(context, 'VCardTitle', { text: 'Recent orders' }),
      element(context, 'VDataTable', {
        name: 'Orders table',
        props: {
          headers: [
            { title: '#', key: 'id', width: 80 },
            { title: 'Customer', key: 'customer' },
            STATUS_COLUMN,
            { title: 'Total, $', key: 'total', align: 'end' },
          ],
          items: ORDERS,
          itemsPerPage: 5,
          striped: true,
          headerColor: 'primary',
        },
      }),
    ],
  })
  const node = element(context, 'div', {
    name: 'Dashboard',
    children: [
      element(context, 'VCardTitle', { text: 'Dashboard', classes: ['text-h4', 'mb-4'] }),
      element(context, 'VRow', {
        name: 'Key numbers',
        children: [
          stat('$12,480', 'Revenue this week', 'success'),
          stat('128', 'Orders', 'info'),
          stat('34', 'New customers', 'warning'),
        ],
      }),
      orders,
    ],
  })
  return { node, variables: {} }
}

function buildTablePage(context: TemplateContext): Built {
  const filter = (status: string) => element(context, 'VBtn', { name: status, props: { value: status }, text: status })
  const details = element(context, 'VCard', {
    name: 'Order details',
    props: { variant: 'outlined', color: 'primary' },
    classes: ['mt-6', 'pa-4'],
    vIf: 'selected != none',
    children: [
      element(context, 'VCardTitle', { text: 'Order #{{selected.id}} · {{selected.customer}}' }),
      element(context, 'VCardText', { text: 'Status: {{selected.status}} · Total: ${{selected.total}}' }),
      element(context, 'VBtn', {
        name: 'Close details',
        props: { variant: 'text', color: 'primary', prependIcon: 'mdi-close' },
        text: 'Close',
        click: { type: ActionType.Set, key: 'selected', value: 'none' },
      }),
    ],
  })
  const node = element(context, 'div', {
    name: 'Orders page',
    children: [
      element(context, 'VCardTitle', { text: 'Orders', classes: ['text-h4', 'mb-4'] }),
      element(context, 'div', {
        name: 'Filters',
        classes: ['d-flex', 'flex-wrap', 'align-center', 'ga-4', 'mb-2'],
        children: [
          element(context, 'VTextField', {
            name: 'Search',
            props: {
              label: 'Search orders',
              variant: 'outlined',
              density: 'compact',
              prependInnerIcon: 'mdi-magnify',
              clearable: true,
              hideDetails: true,
            },
            classes: ['flex-grow-1'],
            model: 'query',
          }),
          element(context, 'VBtnToggle', {
            name: 'Status filter',
            props: { mandatory: false },
            model: 'query',
            children: [filter('Paid'), filter('Pending'), filter('Shipped')],
          }),
        ],
      }),
      element(context, 'VDataTable', {
        name: 'Orders table',
        props: {
          headers: [
            { title: '#', key: 'id', width: 80 },
            { title: 'Customer', key: 'customer' },
            STATUS_COLUMN,
            { title: 'Total, $', key: 'total', align: 'end' },
          ],
          items: ORDERS,
          itemsPerPage: 5,
          hover: true,
          search: '{{query}}',
          noDataText: 'No orders match',
        },
        click: { type: ActionType.Set, key: 'selected', value: '{{item}}' },
      }),
      details,
    ],
  })
  return { node, variables: { query: '', selected: 'none' } }
}

function buildLogin(context: TemplateContext): Built {
  const node = element(context, 'VCard', {
    name: 'Sign-in form',
    props: { maxWidth: 420, variant: 'outlined' },
    classes: ['mx-auto', 'pa-6', 'rounded-lg'],
    children: [
      element(context, 'VCardTitle', { text: 'Sign in', classes: ['text-h5'] }),
      element(context, 'VCardText', { text: 'Use your email and password to continue.' }),
      element(context, 'VAlert', {
        name: 'Welcome message',
        props: { type: 'success', variant: 'tonal' },
        classes: ['mb-4'],
        text: 'Welcome back!',
        vIf: 'signedIn',
      }),
      element(context, 'VTextField', {
        name: 'Email',
        props: { label: 'Email', type: 'email', variant: 'outlined', prependInnerIcon: 'mdi-email-outline' },
        model: 'email',
      }),
      element(context, 'VTextField', {
        name: 'Password',
        props: { label: 'Password', type: 'password', variant: 'outlined', prependInnerIcon: 'mdi-lock-outline' },
        model: 'password',
      }),
      element(context, 'VCheckbox', { name: 'Remember me', props: { label: 'Remember me' }, model: 'remember' }),
      element(context, 'VBtn', {
        name: 'Sign in button',
        props: { color: 'primary', variant: 'flat', block: true, size: 'large' },
        text: 'Sign in',
        click: { type: ActionType.Set, key: 'signedIn', value: 'true' },
      }),
    ],
  })
  return { node, variables: { email: '', password: '', remember: false, signedIn: false } }
}

const BUILDERS = { dashboard: buildDashboard, table: buildTablePage, login: buildLogin }
