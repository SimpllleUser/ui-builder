import { ActionType, TemplateKind } from '../enums'
import { element, type Builder } from './templateElement'
import { readTextSetting } from './templateSettings'

/** Props: `title`, `text`, `email`, `phone`, `address` (an empty one is left out), `submitLabel`, `successMessage`. */
export const buildContact: Builder = (context, props) => {
  const detail = (key: string, icon: string) => {
    const value = readTextSetting(TemplateKind.Contact, props, key)
    return value ? element(context, 'VListItem', { name: key, props: { prependIcon: icon, title: value } }) : null
  }
  const details = [
    detail('email', 'mdi-email-outline'),
    detail('phone', 'mdi-phone-outline'),
    detail('address', 'mdi-map-marker-outline'),
  ].filter(item => item !== null)
  const field = (type: string, label: string, model: string) =>
    element(context, type, { name: label, props: { label, variant: 'outlined' }, model })

  const node = element(context, 'VRow', {
    name: 'Contact',
    classes: ['py-8'],
    children: [
      element(context, 'VCol', {
        name: 'Details',
        props: { cols: 12, md: 5 },
        children: [
          element(context, 'VCardTitle', {
            text: readTextSetting(TemplateKind.Contact, props, 'title'),
            classes: ['text-h4', 'text-wrap'],
          }),
          element(context, 'VCardText', { text: readTextSetting(TemplateKind.Contact, props, 'text') }),
          element(context, 'VList', { name: 'Contact details', children: details }),
        ],
      }),
      element(context, 'VCol', {
        name: 'Form',
        props: { cols: 12, md: 7 },
        children: [
          element(context, 'VCard', {
            name: 'Message form',
            props: { variant: 'outlined' },
            classes: ['pa-6'],
            children: [
              element(context, 'VAlert', {
                name: 'Sent message',
                props: { type: 'success', variant: 'tonal' },
                classes: ['mb-4'],
                text: readTextSetting(TemplateKind.Contact, props, 'successMessage'),
                vIf: 'contactSent',
              }),
              field('VTextField', 'Name', 'contactName'),
              field('VTextField', 'Email', 'contactEmail'),
              field('VTextarea', 'Message', 'contactMessage'),
              element(context, 'VBtn', {
                name: 'Send message',
                props: { color: 'primary', variant: 'flat', size: 'large' },
                text: readTextSetting(TemplateKind.Contact, props, 'submitLabel'),
                click: { type: ActionType.Set, key: 'contactSent', value: 'true' },
              }),
            ],
          }),
        ],
      }),
    ],
  })
  return { node, variables: { contactName: '', contactEmail: '', contactMessage: '', contactSent: false } }
}
