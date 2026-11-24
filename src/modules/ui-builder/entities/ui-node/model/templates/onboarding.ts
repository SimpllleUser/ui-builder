import { ActionType, TemplateKind } from '../enums'
import type { UiAction } from '../types'
import { element, type Builder } from './templateElement'
import { type TextRecord } from './templateProps'
import { readListSetting, readTextSetting } from './templateSettings'

const STEP_VARIABLE = 'step'

/**
 * Props: `steps` as a list of `{ title, text, icon }`, `finishLabel`.
 * One step shows at a time, driven by the `step` variable; the buttons only set it, as the preview has no counter.
 */
export const buildOnboarding: Builder = (context, props) => {
  const steps = readListSetting(TemplateKind.Onboarding, props, 'steps')
  const goTo = (number: number): UiAction => ({ type: ActionType.Set, key: STEP_VARIABLE, value: String(number) })
  const stepCard = ({ title, text, icon }: TextRecord, index: number) => {
    const number = index + 1
    const isLast = number === steps.length
    return element(context, 'VCard', {
      name: `Step ${number}`,
      props: { variant: 'outlined', maxWidth: 480 },
      classes: ['mx-auto', 'pa-6', 'text-center'],
      vIf: `${STEP_VARIABLE} == ${number}`,
      children: [
        element(context, 'VIcon', { props: { icon, size: 'x-large', color: 'primary' }, classes: ['mb-2'] }),
        element(context, 'VCardTitle', { text: title, classes: ['text-h5', 'text-wrap'] }),
        element(context, 'VCardText', { text }),
        element(context, 'VCardText', {
          name: 'Progress',
          text: `Step ${number} of ${steps.length}`,
          classes: ['text-medium-emphasis'],
        }),
        element(context, 'div', {
          name: 'Actions',
          classes: ['d-flex', 'justify-space-between'],
          children: [
            element(context, 'VBtn', {
              name: 'Back',
              props: { variant: 'text', disabled: number === 1 },
              text: 'Back',
              click: goTo(Math.max(1, number - 1)),
            }),
            element(context, 'VBtn', {
              name: isLast ? 'Finish' : 'Next',
              props: { color: 'primary', variant: 'flat' },
              text: isLast ? readTextSetting(TemplateKind.Onboarding, props, 'finishLabel') : 'Next',
              click: isLast ? { type: ActionType.Set, key: 'onboarded', value: 'true' } : goTo(number + 1),
            }),
          ],
        }),
      ],
    })
  }
  const node = element(context, 'div', {
    name: 'Onboarding',
    classes: ['py-8'],
    children: [
      ...steps.map(stepCard),
      element(context, 'VAlert', {
        name: 'Done message',
        props: { type: 'success', variant: 'tonal', maxWidth: 480 },
        classes: ['mx-auto'],
        text: "You're all set!",
        vIf: 'onboarded',
      }),
    ],
  })
  return { node, variables: { [STEP_VARIABLE]: 1, onboarded: false } }
}
