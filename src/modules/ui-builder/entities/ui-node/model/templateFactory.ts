import { ROOT_NODE_ID } from './constants'
import { ActionType, TemplateKind } from './enums'
import { buildBlog } from './templates/blog'
import { buildContact } from './templates/contact'
import { buildFaq } from './templates/faq'
import { buildFooter } from './templates/footer'
import { buildLanding } from './templates/landing'
import { buildOnboarding } from './templates/onboarding'
import { buildPricing } from './templates/pricing'
import { buildSettingsPage } from './templates/settingsPage'
import {
  element,
  type Builder,
  type Built,
  type TemplateContext,
  type TemplateProps,
} from './templates/templateElement'
import { resolveTemplateProps } from './templates/templatePresets'
import { buildTestimonials } from './templates/testimonials'
import { buildWizard } from './templates/wizard'
import type { UiNode } from './types'

export type { TemplateContext, TemplateProps }

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
  {
    kind: TemplateKind.Testimonials,
    label: 'Testimonials',
    description: 'Customer quotes in columns',
    icon: 'mdi-format-quote-open-outline',
  },
  { kind: TemplateKind.Faq, label: 'FAQ', description: 'Questions that expand', icon: 'mdi-help-circle-outline' },
  {
    kind: TemplateKind.Onboarding,
    label: 'Onboarding',
    description: 'Steps that go forward and back',
    icon: 'mdi-stairs-up',
  },
  { kind: TemplateKind.Blog, label: 'Blog', description: 'Post cards with tags', icon: 'mdi-post-outline' },
  {
    kind: TemplateKind.Contact,
    label: 'Contact',
    description: 'Details and a message form',
    icon: 'mdi-email-edit-outline',
  },
  {
    kind: TemplateKind.Footer,
    label: 'Footer',
    description: 'Brand, link columns, copyright',
    icon: 'mdi-page-layout-footer',
  },
  {
    kind: TemplateKind.Landing,
    label: 'Landing page',
    description: 'Hero, features and a call to action',
    icon: 'mdi-rocket-launch-outline',
  },
  {
    kind: TemplateKind.Settings,
    label: 'Settings page',
    description: 'Profile, notifications and Save',
    icon: 'mdi-cog-outline',
  },
  {
    kind: TemplateKind.Wizard,
    label: 'Wizard',
    description: 'A form in several checked steps',
    icon: 'mdi-wizard-hat',
  },
  { kind: TemplateKind.Pricing, label: 'Pricing', description: 'Plans side by side', icon: 'mdi-tag-outline' },
]

/** Every starter builds one element. Each reads its settings from the props and has a default for all of them. */
const BUILDERS: Record<TemplateKind, Builder> = {
  [TemplateKind.Card]: buildWelcomeCard,
  [TemplateKind.Form]: buildContactForm,
  [TemplateKind.Columns]: buildColumns,
  [TemplateKind.Dashboard]: buildDashboard,
  [TemplateKind.Table]: buildTablePage,
  [TemplateKind.Login]: buildLogin,
  [TemplateKind.Testimonials]: buildTestimonials,
  [TemplateKind.Footer]: buildFooter,
  [TemplateKind.Faq]: buildFaq,
  [TemplateKind.Onboarding]: buildOnboarding,
  [TemplateKind.Blog]: buildBlog,
  [TemplateKind.Contact]: buildContact,
  [TemplateKind.Landing]: buildLanding,
  [TemplateKind.Settings]: buildSettingsPage,
  [TemplateKind.Wizard]: buildWizard,
  [TemplateKind.Pricing]: buildPricing,
}

/** `props` customizes the template (texts, lists of entries, or a `preset` id); what is not given keeps its default. */
export function addTemplate(context: TemplateContext, kind: TemplateKind, props: TemplateProps = {}): void {
  const { node, variables } = BUILDERS[kind](context, resolveTemplateProps(kind, props))
  context.appendNode(ROOT_NODE_ID, node, null, () => context.ensureVariables(variables))
}

interface CardTexts {
  name: string
  title: string
  fields: string[]
  action: string
}

const WELCOME_CARD: CardTexts = {
  name: 'Welcome card',
  title: 'Your next idea starts here',
  fields: [],
  action: 'Get started',
}
const CONTACT_FORM: CardTexts = {
  name: 'Contact form',
  title: 'Get in touch',
  fields: ['Name', 'Email', 'Message'],
  action: 'Send message',
}

function createCard(context: TemplateContext, texts: CardTexts): UiNode {
  const card = context.createNode('VCard', texts.name)
  card.classes = ['pa-6', 'rounded-lg']

  const title = context.createNode('VCardTitle')
  title.classes.push('text-wrap')
  title.children[0].name = texts.title

  const text = context.createNode('VCardText')
  text.children[0].name = 'Select an element to edit its content and appearance.'
  card.children = [title, text]

  for (const label of texts.fields) {
    const input = context.createNode('VTextField')
    input.props = { label, variant: 'outlined', type: label === 'Email' ? 'email' : 'text' }
    card.children.push(input)
  }

  const button = context.createNode('VBtn')
  button.props = { color: 'primary', variant: 'flat' }
  button.children[0].name = texts.action
  card.children.push(button)

  return card
}

function buildWelcomeCard(context: TemplateContext): Built {
  return { node: createCard(context, WELCOME_CARD), variables: {} }
}

function buildContactForm(context: TemplateContext): Built {
  return { node: createCard(context, CONTACT_FORM), variables: {} }
}

function buildColumns(context: TemplateContext): Built {
  const card = createCard(context, WELCOME_CARD)
  const row = context.createNode('VRow', 'Two columns')
  row.children = [1, 2].map(number => {
    const column = context.createNode('VCol', `Column ${number}`)
    column.props = { cols: 12, md: 6 }
    column.children = [context.cloneNodeWithNewIds(card)]
    return column
  })
  return { node: row, variables: {} }
}

// ─── Templates that bring their own variables and behavior ─────────────────────

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
