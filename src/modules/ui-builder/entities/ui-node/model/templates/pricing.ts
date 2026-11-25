import { ActionType, TemplateKind } from '../enums'
import { element, type Builder } from './templateElement'
import { type TextRecord } from './templateProps'
import { readListSetting, readTextSetting } from './templateSettings'

const GRID_WIDTH = 12
const MAX_PLANS_IN_ROW = 4
const FEATURE_SEPARATOR = ';'

/**
 * Props: `title`, `subtitle`, `featured` (name of the plan to highlight), `plans` as a list of
 * `{ name, price, period, description, features, button }`, with the features separated by `;`.
 */
export const buildPricing: Builder = (context, props) => {
  const plans = readListSetting(TemplateKind.Pricing, props, 'plans')
  const featured = readTextSetting(TemplateKind.Pricing, props, 'featured')
  const columns = GRID_WIDTH / Math.min(Math.max(plans.length, 1), MAX_PLANS_IN_ROW)
  const planColumn = ({ name, price, period, description, features, button }: TextRecord) => {
    const isFeatured = name === featured
    const listed = features
      .split(FEATURE_SEPARATOR)
      .map(feature => feature.trim())
      .filter(Boolean)
    return element(context, 'VCol', {
      name: `${name} column`,
      props: { cols: GRID_WIDTH, md: columns },
      children: [
        element(context, 'VCard', {
          name: `${name} plan`,
          props: isFeatured ? { variant: 'tonal', color: 'primary' } : { variant: 'outlined' },
          classes: ['pa-4', 'h-100', 'd-flex', 'flex-column'],
          children: [
            element(context, 'VCardTitle', { text: name }),
            element(context, 'VCardText', { name: 'Price', text: price, classes: ['text-h3', 'pb-0'] }),
            element(context, 'VCardText', { name: 'Period', text: period, classes: ['text-medium-emphasis', 'py-1'] }),
            element(context, 'VCardText', { name: 'Description', text: description }),
            element(context, 'div', {
              name: 'Features',
              classes: ['flex-grow-1'],
              children: listed.map(feature =>
                element(context, 'VCardText', { name: 'Feature', text: `✓ ${feature}`, classes: ['py-1'] }),
              ),
            }),
            element(context, 'VBtn', {
              name: `Choose ${name}`,
              props: { block: true, color: 'primary', variant: isFeatured ? 'flat' : 'outlined' },
              classes: ['mt-4'],
              text: button,
              click: { type: ActionType.Notify, message: `${name} plan selected` },
            }),
          ],
        }),
      ],
    })
  }
  const node = element(context, 'div', {
    name: 'Pricing',
    classes: ['py-8'],
    children: [
      element(context, 'VCardTitle', {
        text: readTextSetting(TemplateKind.Pricing, props, 'title'),
        classes: ['text-h4', 'text-center', 'text-wrap'],
      }),
      element(context, 'VCardText', {
        name: 'Subtitle',
        text: readTextSetting(TemplateKind.Pricing, props, 'subtitle'),
        classes: ['text-center', 'text-medium-emphasis', 'mb-4'],
      }),
      element(context, 'VRow', { name: 'Plans', children: plans.map(planColumn) }),
    ],
  })
  return { node, variables: {} }
}
