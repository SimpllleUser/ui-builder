import { ActionType, RuleType, TemplateKind } from '../enums'
import type { UiAction, UiNode } from '../types'
import { element, type Builder } from './templateElement'
import { readTexts } from './templateProps'
import { readTextSetting } from './templateSettings'

const STEP_VARIABLE = 'wizardStep'
const DEFAULT_PLANS = ['Free', 'Pro', 'Team']
const STEP_COUNT = 3
const DONE_STEP = STEP_COUNT + 1

/**
 * Props: `title`, `accountTitle`, `planTitle`, `reviewTitle`, `finishLabel`, `successMessage`, `plans` (list of names),
 * and the words of the controls: `stepLabel` (with `{number}` and `{total}`), `nameLabel`, `emailLabel`, `planLabel`,
 * `backLabel`, `nextLabel`, `restartLabel`.
 * One step shows at a time, driven by the `wizardStep` variable. Each step is a form, so Next works only when
 * its fields are filled in correctly.
 */
export const buildWizard: Builder = (context, props) => {
  const read = (key: string) => readTextSetting(TemplateKind.Wizard, props, key)
  const goTo = (step: number): UiAction => ({ type: ActionType.Set, key: STEP_VARIABLE, value: String(step) })

  const stepForm = (number: number, title: string, nextLabel: string, fields: UiNode[]) =>
    element(context, 'VForm', {
      name: `Step ${number}`,
      vIf: `${STEP_VARIABLE} == ${number}`,
      submit: goTo(number + 1),
      children: [
        element(context, 'VCardText', {
          name: 'Progress',
          text: read('stepLabel').replace('{number}', String(number)).replace('{total}', String(STEP_COUNT)),
          classes: ['text-medium-emphasis', 'px-0'],
        }),
        element(context, 'VCardTitle', { text: title, classes: ['text-h6', 'px-0', 'mb-2', 'text-wrap'] }),
        ...fields,
        element(context, 'div', {
          name: 'Actions',
          classes: ['d-flex', 'justify-space-between', 'mt-4'],
          children: [
            element(context, 'VBtn', {
              name: 'Back',
              props: { variant: 'text', disabled: number === 1 },
              text: read('backLabel'),
              click: goTo(Math.max(1, number - 1)),
            }),
            element(context, 'VBtn', {
              name: nextLabel,
              props: { color: 'primary', variant: 'flat', type: 'submit' },
              text: nextLabel,
            }),
          ],
        }),
      ],
    })

  const account = stepForm(1, read('accountTitle'), read('nextLabel'), [
    element(context, 'VTextField', {
      name: 'Name',
      props: { label: read('nameLabel'), variant: 'outlined' },
      model: 'wizardName',
      rules: [{ type: RuleType.Required }],
    }),
    element(context, 'VTextField', {
      name: 'Email',
      props: { label: read('emailLabel'), type: 'email', variant: 'outlined' },
      model: 'wizardEmail',
      rules: [{ type: RuleType.Required }, { type: RuleType.Email }],
    }),
  ])
  const plan = stepForm(2, read('planTitle'), read('nextLabel'), [
    element(context, 'VSelect', {
      name: 'Plan',
      props: { label: read('planLabel'), items: readTexts(props, 'plans', DEFAULT_PLANS), variant: 'outlined' },
      model: 'wizardPlan',
      rules: [{ type: RuleType.Required }],
    }),
  ])
  const review = stepForm(3, read('reviewTitle'), read('finishLabel'), [
    element(context, 'VCardText', {
      name: 'Summary',
      text: '{{wizardName}} · {{wizardEmail}} · {{wizardPlan}}',
      classes: ['px-0'],
    }),
  ])
  const done = element(context, 'div', {
    name: 'Done',
    vIf: `${STEP_VARIABLE} == ${DONE_STEP}`,
    children: [
      element(context, 'VAlert', {
        name: 'Done message',
        props: { type: 'success', variant: 'tonal' },
        classes: ['mb-4'],
        text: read('successMessage'),
      }),
      element(context, 'VBtn', {
        name: 'Start again',
        props: { variant: 'text' },
        text: read('restartLabel'),
        click: goTo(1),
      }),
    ],
  })

  const node = element(context, 'VCard', {
    name: 'Wizard',
    props: { variant: 'outlined', maxWidth: 520 },
    classes: ['mx-auto', 'pa-6', 'rounded-lg'],
    children: [
      element(context, 'VCardTitle', { text: read('title'), classes: ['text-h5', 'px-0', 'text-wrap'] }),
      account,
      plan,
      review,
      done,
    ],
  })
  return {
    node,
    variables: { [STEP_VARIABLE]: 1, wizardName: '', wizardEmail: '', wizardPlan: '' },
  }
}
