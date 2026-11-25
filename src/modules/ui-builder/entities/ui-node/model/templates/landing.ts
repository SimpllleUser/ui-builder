import { TemplateKind } from '../enums'
import { element, type Builder } from './templateElement'
import { type TextRecord } from './templateProps'
import { readListSetting, readTextSetting } from './templateSettings'

/**
 * Props: `title`, `text`, `primaryLabel`, `secondaryLabel`, `features` as a list of `{ title, text, icon }`,
 * `ctaTitle`, `ctaLabel`. An empty second button text hides that button.
 */
export const buildLanding: Builder = (context, props) => {
  const read = (key: string) => readTextSetting(TemplateKind.Landing, props, key)
  const button = (name: string, text: string, variant: string) =>
    element(context, 'VBtn', { name, props: { color: 'primary', variant, size: 'large' }, text })

  const hero = element(context, 'div', {
    name: 'Hero',
    classes: ['text-center', 'py-16', 'px-4'],
    children: [
      element(context, 'VCardTitle', { text: read('title'), classes: ['text-h3', 'text-wrap'] }),
      element(context, 'VCardText', { text: read('text'), classes: ['text-h6', 'text-medium-emphasis'] }),
      element(context, 'div', {
        name: 'Hero actions',
        classes: ['d-flex', 'flex-wrap', 'justify-center', 'ga-4', 'mt-4'],
        children: [
          button('Primary action', read('primaryLabel'), 'flat'),
          ...(read('secondaryLabel') ? [button('Secondary action', read('secondaryLabel'), 'outlined')] : []),
        ],
      }),
    ],
  })

  const feature = ({ title, text, icon }: TextRecord) =>
    element(context, 'VCol', {
      name: `${title} column`,
      props: { cols: 12, md: 4 },
      children: [
        element(context, 'VCard', {
          name: title,
          props: { variant: 'outlined' },
          classes: ['pa-4', 'h-100', 'text-center'],
          children: [
            element(context, 'VIcon', { props: { icon, size: 'x-large', color: 'primary' }, classes: ['mb-2'] }),
            element(context, 'VCardTitle', { text: title, classes: ['text-wrap'] }),
            element(context, 'VCardText', { text }),
          ],
        }),
      ],
    })

  const callToAction = element(context, 'VCard', {
    name: 'Call to action',
    props: { variant: 'tonal', color: 'primary' },
    classes: ['mt-12', 'pa-8', 'text-center', 'rounded-lg'],
    children: [
      element(context, 'VCardTitle', { text: read('ctaTitle'), classes: ['text-h5', 'text-wrap', 'mb-4'] }),
      button('Final action', read('ctaLabel'), 'flat'),
    ],
  })

  const node = element(context, 'div', {
    name: 'Landing page',
    classes: ['pb-8'],
    children: [
      hero,
      element(context, 'VRow', {
        name: 'Features',
        children: readListSetting(TemplateKind.Landing, props, 'features').map(feature),
      }),
      callToAction,
    ],
  })
  return { node, variables: {} }
}
