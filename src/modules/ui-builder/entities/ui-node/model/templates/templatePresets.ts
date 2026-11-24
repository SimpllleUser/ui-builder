import { TemplateKind } from '../enums'
import type { TemplateProps } from './templateElement'
import { defaultTemplateProps } from './templateSettings'

export interface TemplatePreset {
  id: string
  label: string
  /** Only what differs from the defaults. */
  props: TemplateProps
}

const FOOTER_BRAND_ONLY: TemplateProps = { columns: [] }

const MORE_STEPS = [
  { title: 'Welcome', text: 'Tell us a little about yourself.', icon: 'mdi-hand-wave-outline' },
  { title: 'Create a project', text: 'Pick a template or start blank.', icon: 'mdi-folder-plus-outline' },
  { title: 'Connect your data', text: 'Import a file or link a data source.', icon: 'mdi-database-import-outline' },
  { title: 'Invite your team', text: 'Share the project with others.', icon: 'mdi-account-multiple-plus-outline' },
  { title: 'Publish', text: 'Review everything and go live.', icon: 'mdi-rocket-launch-outline' },
]

/** The first preset of every template is its default look. */
export const TEMPLATE_PRESETS: Partial<Record<TemplateKind, TemplatePreset[]>> = {
  [TemplateKind.Testimonials]: [
    { id: 'three-columns', label: '3 columns', props: {} },
    {
      id: 'two-columns',
      label: '2 columns',
      props: {
        quotes: [
          { quote: 'We shipped our landing page in an afternoon.', author: 'Anna Koval', role: 'Founder, Bloom' },
          { quote: 'The result is real code, not a mock-up.', author: 'Ivan Melnyk', role: 'CTO, Nordic' },
        ],
      },
    },
    {
      id: 'single-quote',
      label: 'One big quote',
      props: {
        quotes: [
          {
            quote: 'Our team stopped waiting for the next sprint to change a text.',
            author: 'Olena Shevchuk',
            role: 'Marketing lead',
          },
        ],
      },
    },
  ],
  [TemplateKind.Faq]: [
    { id: 'accordion', label: 'Accordion', props: {} },
    { id: 'popout', label: 'Popout', props: { variant: 'popout' } },
    { id: 'inset', label: 'Inset', props: { variant: 'inset' } },
  ],
  [TemplateKind.Footer]: [
    { id: 'full', label: 'Full', props: {} },
    { id: 'minimal', label: 'Minimal', props: FOOTER_BRAND_ONLY },
  ],
  [TemplateKind.Blog]: [
    { id: 'three-cards', label: '3 cards', props: {} },
    {
      id: 'two-cards',
      label: '2 cards',
      props: {
        posts: [
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
        ],
      },
    },
  ],
  [TemplateKind.Contact]: [
    { id: 'with-details', label: 'With contacts', props: {} },
    { id: 'form-only', label: 'Form only', props: { email: '', phone: '', address: '' } },
  ],
  [TemplateKind.Onboarding]: [
    { id: 'three-steps', label: '3 steps', props: {} },
    { id: 'five-steps', label: '5 steps', props: { steps: MORE_STEPS } },
  ],
}

export function templatePresets(kind: TemplateKind): TemplatePreset[] {
  return TEMPLATE_PRESETS[kind] ?? []
}

/** The settings of a preset: the template's defaults with the preset's differences on top (copies). */
export function presetTemplateProps(kind: TemplateKind, presetId: string): TemplateProps {
  const preset = templatePresets(kind).find(candidate => candidate.id === presetId)
  return { ...defaultTemplateProps(kind), ...structuredClone(preset?.props ?? {}) }
}

/** Props as given by a caller: a `preset` id fills in what the caller left out. */
export function resolveTemplateProps(kind: TemplateKind, props: TemplateProps): TemplateProps {
  const { preset, ...own } = props
  if (typeof preset !== 'string') return own
  const chosen = templatePresets(kind).find(candidate => candidate.id === preset)
  return { ...structuredClone(chosen?.props ?? {}), ...own }
}
