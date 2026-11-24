import { TemplateKind } from '../enums'
import { element, type Builder } from './templateElement'
import { readText, type TextRecord } from './templateProps'
import { readListSetting, readTextSetting } from './templateSettings'

/** Props: `title`, `questions` as a list of `{ question, answer }`, `variant` of the panels (default, accordion, inset, popout). */
export const buildFaq: Builder = (context, props) => {
  const questions = readListSetting(TemplateKind.Faq, props, 'questions')
  const node = element(context, 'div', {
    name: 'FAQ',
    classes: ['py-8'],
    children: [
      element(context, 'VCardTitle', {
        text: readTextSetting(TemplateKind.Faq, props, 'title'),
        classes: ['text-h4', 'mb-4'],
      }),
      element(context, 'VExpansionPanels', {
        name: 'Questions',
        props: { variant: readText(props, 'variant', 'accordion') },
        children: questions.map(({ question, answer }) =>
          element(context, 'VExpansionPanel', { name: question, props: { title: question, text: answer } }),
        ),
      }),
    ],
  })
  return { node, variables: {} }
}
