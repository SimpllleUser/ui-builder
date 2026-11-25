import { TemplateKind } from '../enums'
import type { TemplateProps } from './templateElement'
import { readRecords, readText, type TextRecord } from './templateProps'

export enum TemplateSettingKind {
  Text = 'text',
  List = 'list',
}

export interface TemplateField {
  key: string
  label: string
}

interface TextSetting {
  kind: TemplateSettingKind.Text
  key: string
  label: string
  defaultValue: string
}

interface ListSetting {
  kind: TemplateSettingKind.List
  key: string
  label: string
  /** The parts of one entry, in the order they are shown. */
  fields: TemplateField[]
  defaultValue: TextRecord[]
}

export type TemplateSetting = TextSetting | ListSetting

const text = (key: string, label: string, defaultValue: string): TextSetting => ({
  kind: TemplateSettingKind.Text,
  key,
  label,
  defaultValue,
})

const list = (key: string, label: string, fields: TemplateField[], defaultValue: TextRecord[]): ListSetting => ({
  kind: TemplateSettingKind.List,
  key,
  label,
  fields,
  defaultValue,
})

/**
 * What a template lets the user change: the single source of its defaults, read by the template itself
 * and by the settings dialog, so the two cannot drift apart. A template without an entry is added at once.
 */
export const TEMPLATE_SETTINGS: Partial<Record<TemplateKind, TemplateSetting[]>> = {
  [TemplateKind.Testimonials]: [
    text('title', 'Title', 'What our customers say'),
    list(
      'quotes',
      'Quotes',
      [
        { key: 'quote', label: 'Quote' },
        { key: 'author', label: 'Author' },
        { key: 'role', label: 'Role' },
      ],
      [
        { quote: 'We shipped our landing page in an afternoon.', author: 'Anna Koval', role: 'Founder, Bloom' },
        {
          quote: 'The editor feels like a design tool, but the result is real code.',
          author: 'Ivan Melnyk',
          role: 'CTO, Nordic',
        },
        {
          quote: 'Our team stopped waiting for the next sprint to change a text.',
          author: 'Olena Shevchuk',
          role: 'Marketing lead',
        },
      ],
    ),
  ],
  [TemplateKind.Faq]: [
    text('title', 'Title', 'Frequently asked questions'),
    list(
      'questions',
      'Questions',
      [
        { key: 'question', label: 'Question' },
        { key: 'answer', label: 'Answer' },
      ],
      [
        {
          question: 'How do I get started?',
          answer: 'Add a template, select an element and edit its content in the panel.',
        },
        {
          question: 'Can I change the design later?',
          answer: 'Yes. Every text, color and spacing stays editable at any time.',
        },
        {
          question: 'Is my work saved?',
          answer: 'The project is saved in your browser and can be exported as JSON or Vue code.',
        },
      ],
    ),
  ],
  [TemplateKind.Onboarding]: [
    text('finishLabel', 'Last button', 'Get started'),
    list(
      'steps',
      'Steps',
      [
        { key: 'title', label: 'Title' },
        { key: 'text', label: 'Text' },
        { key: 'icon', label: 'Icon (mdi-…)' },
      ],
      [
        {
          title: 'Welcome',
          text: 'Tell us a little about yourself to personalize your workspace.',
          icon: 'mdi-hand-wave-outline',
        },
        {
          title: 'Create a project',
          text: 'Pick a starting template or begin with a blank page.',
          icon: 'mdi-folder-plus-outline',
        },
        {
          title: 'Invite your team',
          text: 'Share the project so others can comment and edit.',
          icon: 'mdi-account-multiple-plus-outline',
        },
      ],
    ),
  ],
  [TemplateKind.Blog]: [
    text('title', 'Title', 'From the blog'),
    text('subtitle', 'Subtitle', 'Guides, news and stories.'),
    text('readMoreLabel', 'Link text', 'Read more'),
    list(
      'posts',
      'Posts',
      [
        { key: 'tag', label: 'Tag' },
        { key: 'title', label: 'Title' },
        { key: 'excerpt', label: 'Excerpt' },
        { key: 'date', label: 'Date' },
      ],
      [
        {
          tag: 'Guide',
          title: 'Ten habits of a tidy design system',
          excerpt: 'Small rules that keep a growing interface consistent.',
          date: 'Nov 12',
        },
        {
          tag: 'News',
          title: 'What is new in this release',
          excerpt: 'Templates, graph view and a faster preview.',
          date: 'Nov 5',
        },
        {
          tag: 'Story',
          title: 'How one team cut page work in half',
          excerpt: 'From a ticket queue to editing content on their own.',
          date: 'Oct 28',
        },
      ],
    ),
  ],
  [TemplateKind.Contact]: [
    text('title', 'Title', 'Contact us'),
    text('text', 'Text', 'We usually reply within one business day.'),
    text('email', 'Email (empty to hide)', 'hello@example.com'),
    text('phone', 'Phone (empty to hide)', '+380 44 123 45 67'),
    text('address', 'Address (empty to hide)', 'Kyiv, Ukraine'),
    text('submitLabel', 'Button text', 'Send message'),
    text('successMessage', 'Message after sending', 'Thank you! We will be in touch.'),
  ],
  [TemplateKind.Landing]: [
    text('title', 'Headline', 'Build your interface in minutes'),
    text('text', 'Text', 'Compose pages visually and take the Vue code with you.'),
    text('primaryLabel', 'Main button', 'Get started'),
    text('secondaryLabel', 'Second button (empty to hide)', 'See how it works'),
    list(
      'features',
      'Features',
      [
        { key: 'title', label: 'Title' },
        { key: 'text', label: 'Text' },
        { key: 'icon', label: 'Icon (mdi-…)' },
      ],
      [
        { title: 'Visual editing', text: 'Drag components and see the result at once.', icon: 'mdi-cursor-move' },
        { title: 'Real behavior', text: 'Variables, conditions and forms that work.', icon: 'mdi-flash-outline' },
        { title: 'Clean export', text: 'Download a Vue project ready to run.', icon: 'mdi-code-tags' },
      ],
    ),
    text('ctaTitle', 'Closing headline', 'Ready to try it?'),
    text('ctaLabel', 'Closing button', 'Create a page'),
  ],
  [TemplateKind.Settings]: [
    text('title', 'Title', 'Settings'),
    text('text', 'Text', 'Manage your profile and what we send you.'),
    text('saveLabel', 'Button text', 'Save changes'),
    text('savedMessage', 'Message after saving', 'Settings saved'),
  ],
  [TemplateKind.Wizard]: [
    text('title', 'Title', 'Create your account'),
    text('accountTitle', 'First step', 'About you'),
    text('planTitle', 'Second step', 'Choose a plan'),
    text('reviewTitle', 'Last step', 'Check and confirm'),
    text('stepLabel', 'Progress ({number} and {total})', 'Step {number} of {total}'),
    text('nameLabel', 'Name field', 'Name'),
    text('emailLabel', 'Email field', 'Email'),
    text('planLabel', 'Plan field', 'Plan'),
    text('backLabel', 'Back button', 'Back'),
    text('nextLabel', 'Next button', 'Next'),
    text('restartLabel', 'Button at the end', 'Start again'),
    text('finishLabel', 'Last button', 'Create account'),
    text('successMessage', 'Message at the end', 'Your account is ready.'),
  ],
  [TemplateKind.Pricing]: [
    text('title', 'Title', 'Simple pricing'),
    text('subtitle', 'Subtitle', 'Start free, upgrade when your team grows.'),
    text('featured', 'Highlighted plan', 'Pro'),
    list(
      'plans',
      'Plans',
      [
        { key: 'name', label: 'Name' },
        { key: 'price', label: 'Price' },
        { key: 'period', label: 'Period' },
        { key: 'description', label: 'Description' },
        { key: 'features', label: 'Features (separated by ;)' },
        { key: 'button', label: 'Button text' },
      ],
      [
        {
          name: 'Free',
          price: '$0',
          period: 'forever',
          description: 'For trying things out.',
          features: '1 project; Basic components; JSON export',
          button: 'Start free',
        },
        {
          name: 'Pro',
          price: '$12',
          period: 'per month',
          description: 'For people who build often.',
          features: 'Unlimited projects; Saved components; Vue project export',
          button: 'Go Pro',
        },
        {
          name: 'Team',
          price: '$39',
          period: 'per month',
          description: 'For teams that build together.',
          features: 'Everything in Pro; Shared library; Priority support',
          button: 'Contact sales',
        },
      ],
    ),
  ],
  [TemplateKind.Footer]: [
    text('brand', 'Brand', 'UI Builder'),
    text('tagline', 'Tagline', 'Build interfaces visually.'),
    text('copyright', 'Copyright', '© 2026 UI Builder. All rights reserved.'),
  ],
}

export function templateHasSettings(kind: TemplateKind): boolean {
  return (TEMPLATE_SETTINGS[kind]?.length ?? 0) > 0
}

/** The settings of a template as props, filled with the defaults (copies, so editing them keeps the defaults intact). */
export function defaultTemplateProps(kind: TemplateKind): TemplateProps {
  return Object.fromEntries(
    (TEMPLATE_SETTINGS[kind] ?? []).map(setting => [
      setting.key,
      setting.kind === TemplateSettingKind.List
        ? setting.defaultValue.map(entry => ({ ...entry }))
        : setting.defaultValue,
    ]),
  )
}

/** One new, empty entry for a list setting. */
export function emptyListEntry(setting: ListSetting): TextRecord {
  return Object.fromEntries(setting.fields.map(field => [field.key, '']))
}

function findSetting(kind: TemplateKind, key: string): TemplateSetting | undefined {
  return TEMPLATE_SETTINGS[kind]?.find(setting => setting.key === key)
}

/** A text setting from the props, with the template's default when it is not given. */
export function readTextSetting(kind: TemplateKind, props: TemplateProps, key: string): string {
  const setting = findSetting(kind, key)
  return readText(props, key, setting?.kind === TemplateSettingKind.Text ? setting.defaultValue : '')
}

/** A list setting from the props, with the template's default when it is not given. */
export function readListSetting(kind: TemplateKind, props: TemplateProps, key: string): TextRecord[] {
  const setting = findSetting(kind, key)
  return readRecords(props, key, setting?.kind === TemplateSettingKind.List ? setting.defaultValue : [])
}
