import { TemplateKind } from '../enums'
import { element, type Builder } from './templateElement'
import { type TextRecord } from './templateProps'
import { readListSetting, readTextSetting } from './templateSettings'

/** Props: `title`, `quotes` as a list of `{ quote, author, role }`. Each quote becomes one column. */
export const buildTestimonials: Builder = (context, props) => {
  const quotes = readListSetting(TemplateKind.Testimonials, props, 'quotes')
  const column = ({ quote, author, role }: TextRecord) =>
    element(context, 'VCol', {
      props: { cols: 12, md: 12 / Math.min(Math.max(quotes.length, 1), 3) },
      children: [
        element(context, 'VCard', {
          name: author,
          props: { variant: 'outlined' },
          classes: ['pa-4', 'h-100'],
          children: [
            element(context, 'VIcon', { props: { icon: 'mdi-format-quote-open', color: 'primary' } }),
            element(context, 'VCardText', { text: quote, classes: ['text-body-1'] }),
            element(context, 'VCardTitle', { text: author, classes: ['text-subtitle-1'] }),
            element(context, 'VCardText', { text: role, classes: ['text-medium-emphasis', 'pt-0'] }),
          ],
        }),
      ],
    })
  const node = element(context, 'div', {
    name: 'Testimonials',
    classes: ['py-8'],
    children: [
      element(context, 'VCardTitle', {
        text: readTextSetting(TemplateKind.Testimonials, props, 'title'),
        classes: ['text-h4', 'text-center', 'mb-6'],
      }),
      element(context, 'VRow', { name: 'Quotes', children: quotes.map(column) }),
    ],
  })
  return { node, variables: {} }
}
