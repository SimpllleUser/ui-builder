import { TemplateKind } from '../enums'
import { element, type Builder, type TemplateProps } from './templateElement'
import { readObjects, readText, readTexts } from './templateProps'
import { readTextSetting } from './templateSettings'

const DEFAULT_COLUMNS: TemplateProps[] = [
  { title: 'Product', links: ['Features', 'Pricing', 'Changelog'] },
  { title: 'Company', links: ['About', 'Blog', 'Careers'] },
  { title: 'Support', links: ['Help center', 'Contact', 'Status'] },
]

interface LinkColumn {
  title: string
  links: string[]
}

/** Props: `brand`, `tagline`, `copyright`, `columns` as a list of `{ title, links }` where `links` is a list of texts. */
export const buildFooter: Builder = (context, props) => {
  const columns: LinkColumn[] = readObjects(props, 'columns', DEFAULT_COLUMNS).map(column => ({
    title: readText(column, 'title', ''),
    links: readTexts(column, 'links', []),
  }))
  const linkColumn = ({ title, links }: LinkColumn) =>
    element(context, 'VCol', {
      name: title,
      props: { cols: 6, md: 2 },
      children: [
        element(context, 'VCardTitle', { text: title, classes: ['text-subtitle-1', 'px-0'] }),
        ...links.map(link =>
          element(context, 'VBtn', {
            name: link,
            props: { variant: 'text', size: 'small' },
            text: link,
            classes: ['d-block', 'px-0'],
          }),
        ),
      ],
    })
  const node = element(context, 'VSheet', {
    name: 'Footer',
    props: { color: 'surface-variant' },
    classes: ['pa-8', 'mt-8'],
    children: [
      element(context, 'VRow', {
        children: [
          element(context, 'VCol', {
            name: 'Brand',
            props: { cols: 12, md: 4 },
            children: [
              element(context, 'VCardTitle', {
                text: readTextSetting(TemplateKind.Footer, props, 'brand'),
                classes: ['text-h5', 'px-0'],
              }),
              element(context, 'VCardText', {
                text: readTextSetting(TemplateKind.Footer, props, 'tagline'),
                classes: ['px-0'],
              }),
            ],
          }),
          ...columns.map(linkColumn),
        ],
      }),
      element(context, 'VDivider', { classes: ['my-4'] }),
      element(context, 'VCardText', {
        name: 'Copyright',
        text: readTextSetting(TemplateKind.Footer, props, 'copyright'),
        classes: ['text-center', 'text-medium-emphasis'],
      }),
    ],
  })
  return { node, variables: {} }
}
