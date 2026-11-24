import { TemplateKind } from '../enums'
import { element, type Builder } from './templateElement'
import { type TextRecord } from './templateProps'
import { readListSetting, readTextSetting } from './templateSettings'

/** Props: `title`, `subtitle`, `posts` as a list of `{ tag, title, excerpt, date }`, `readMoreLabel`. */
export const buildBlog: Builder = (context, props) => {
  const posts = readListSetting(TemplateKind.Blog, props, 'posts')
  const card = ({ tag, title, excerpt, date }: TextRecord) =>
    element(context, 'VCol', {
      props: { cols: 12, md: posts.length === 2 ? 6 : 4 },
      children: [
        element(context, 'VCard', {
          name: title,
          props: { variant: 'outlined' },
          classes: ['h-100'],
          children: [
            element(context, 'VChip', {
              props: { size: 'small', color: 'primary', variant: 'tonal' },
              text: tag,
              classes: ['ma-4', 'mb-0'],
            }),
            element(context, 'VCardTitle', { text: title, classes: ['text-wrap'] }),
            element(context, 'VCardText', { text: excerpt }),
            element(context, 'VCardText', { name: 'Date', text: date, classes: ['text-medium-emphasis', 'pt-0'] }),
            element(context, 'VBtn', {
              props: { variant: 'text', color: 'primary' },
              text: readTextSetting(TemplateKind.Blog, props, 'readMoreLabel'),
              classes: ['ma-2'],
            }),
          ],
        }),
      ],
    })
  const node = element(context, 'div', {
    name: 'Blog',
    classes: ['py-8'],
    children: [
      element(context, 'VCardTitle', {
        text: readTextSetting(TemplateKind.Blog, props, 'title'),
        classes: ['text-h4'],
      }),
      element(context, 'VCardText', {
        name: 'Subtitle',
        text: readTextSetting(TemplateKind.Blog, props, 'subtitle'),
        classes: ['mb-4'],
      }),
      element(context, 'VRow', { name: 'Posts', children: posts.map(card) }),
    ],
  })
  return { node, variables: {} }
}
