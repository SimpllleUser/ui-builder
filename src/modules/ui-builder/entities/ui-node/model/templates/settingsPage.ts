import { ActionType, RuleType, TemplateKind } from '../enums'
import type { UiNode } from '../types'
import { element, type Builder } from './templateElement'
import { readTextSetting } from './templateSettings'

const LANGUAGES = ['English', 'Українська']

/** Props: `title`, `text`, `saveLabel`, `savedMessage`. Saving checks the fields and shows the message. */
export const buildSettingsPage: Builder = (context, props) => {
  const read = (key: string) => readTextSetting(TemplateKind.Settings, props, key)
  const section = (title: string, children: UiNode[]) =>
    element(context, 'VCard', {
      name: title,
      props: { variant: 'outlined' },
      classes: ['pa-4', 'mb-4'],
      children: [element(context, 'VCardTitle', { text: title, classes: ['mb-2'] }), ...children],
    })
  const toggle = (label: string, model: string) =>
    element(context, 'VSwitch', { name: label, props: { label, color: 'primary', hideDetails: true }, model })

  const form = element(context, 'VForm', {
    name: 'Settings form',
    children: [
      section('Profile', [
        element(context, 'VTextField', {
          name: 'Display name',
          props: { label: 'Display name', variant: 'outlined' },
          model: 'settingsName',
          rules: [{ type: RuleType.Required }],
        }),
        element(context, 'VTextField', {
          name: 'Email',
          props: { label: 'Email', type: 'email', variant: 'outlined' },
          model: 'settingsEmail',
          rules: [{ type: RuleType.Required }, { type: RuleType.Email }],
        }),
      ]),
      section('Notifications', [
        toggle('Product news by email', 'settingsNewsletter'),
        toggle('Activity alerts', 'settingsAlerts'),
      ]),
      section('Preferences', [
        element(context, 'VSelect', {
          name: 'Language',
          props: { label: 'Language', items: LANGUAGES, variant: 'outlined' },
          model: 'settingsLanguage',
        }),
      ]),
      element(context, 'VBtn', {
        name: 'Save button',
        props: { color: 'primary', variant: 'flat', type: 'submit' },
        text: read('saveLabel'),
      }),
    ],
    submit: { type: ActionType.Notify, message: read('savedMessage') },
  })

  const node = element(context, 'div', {
    name: 'Settings page',
    props: { style: { maxWidth: '640px' } },
    classes: ['mx-auto', 'py-8'],
    children: [
      element(context, 'VCardTitle', { text: read('title'), classes: ['text-h4'] }),
      element(context, 'VCardText', { text: read('text'), classes: ['text-medium-emphasis'] }),
      form,
    ],
  })
  return {
    node,
    variables: {
      settingsName: '',
      settingsEmail: '',
      settingsNewsletter: true,
      settingsAlerts: false,
      settingsLanguage: LANGUAGES[0],
    },
  }
}
