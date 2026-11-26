import { expressionToJs, helperSources, type HelperName } from './expressionToJs'
import { jsLiteral, jsString } from './jsLiteral'
import { withDependencies } from './computedVariables'
import { emptyLike } from './dataSources'
import { ActionType } from './enums'
import { eventEntries } from './events'
import { variableNameError } from './projectMutations'
import { walkNodes } from './treeUtils'
import { AMBIENT_NAMES, variablesOfNode } from './variableUsage'
import { styleClassSheet } from './styleClasses'
import type { Page, Prefab, Project, UiNode } from './types'
import { renderNodes, type ExportedForm, type TemplateContext } from './vueTemplate'

const INDENT = '  '
const STORE_IMPORT = "import { useProjectStore } from '../stores/project'"
const APP_SHELL_TYPE = 'VApp'

/** Where an exported file keeps the project's variables. */
export enum StateSource {
  /** Its own `ref`s: the file works alone. */
  Local = 'local',
  /** The Pinia store of an exported project, so every file sees the same values. */
  Shared = 'shared',
}

export interface VueFile {
  /** Name to save it under, such as `OrderDesk.vue`. */
  fileName: string
  code: string
}

/** What a project knows besides the starting values of its variables: how they are filled, and its shared styles. */
export type VariableSettings = Pick<Project, 'computed' | 'sources' | 'styleClasses'>

const MESSAGES_IMPORT = "import { useMessagesStore } from '../stores/messages'"
const SNACKBAR = [
  `${INDENT}<VSnackbar :model-value="!!snackbarMessage" @update:model-value="snackbarMessage = ''">`,
  `${INDENT}${INDENT}{{ snackbarMessage }}`,
  `${INDENT}</VSnackbar>`,
]

/** Names of the project variables an element tree reads or writes, in order of first use. */
function collectVariables(root: UiNode): string[] {
  return [...new Set([...walkNodes(root)].flatMap(node => variablesOfNode(node).map(reference => reference.name)))]
}

/**
 * The variables a file has to declare for those it uses: also what computed ones are worked out from, and both
 * sides of a data source, so a loading variable is not left without the request that changes it.
 */
function declaredVariables(used: string[], { computed, sources }: VariableSettings): string[] {
  const names = new Set(withDependencies(used, computed))
  for (const [name, { loadingVariable }] of Object.entries(sources ?? {})) {
    if (!names.has(name) && !(loadingVariable && names.has(loadingVariable))) continue
    names.add(name)
    if (loadingVariable) names.add(loadingVariable)
  }
  return [...names]
}

interface Declarations {
  /** `const x = ref(…)` and `computed(…)` lines. */
  lines: string[]
  /** The requests that fill the data sources. */
  requests: string[]
  usesComputed: boolean
}

function declarations(
  names: string[],
  state: Record<string, unknown>,
  settings: VariableSettings,
  helpers: Set<HelperName>,
): Declarations {
  const computed = settings.computed ?? {}
  const sources = Object.entries(settings.sources ?? {}).filter(([name]) => names.includes(name))
  const loading = new Set(sources.map(([, source]) => source.loadingVariable))
  const known = new Set(names)
  const initial = (name: string) => {
    if (loading.has(name)) return true
    const value = name in state ? state[name] : ''
    return sources.some(([source]) => source === name) ? emptyLike(value) : value
  }
  const refs = names.filter(name => !Object.hasOwn(computed, name))
  const derived = names.filter(name => Object.hasOwn(computed, name))
  const formula = (name: string) =>
    expressionToJs(computed[name], known, helpers, input => (known.has(input) ? `${input}.value` : 'undefined'))
  return {
    lines: [
      ...refs.map(name => `const ${name} = ref(${jsLiteral(initial(name), 0)})`),
      ...derived.map(name => `const ${name} = computed(() => ${formula(name)})`),
    ],
    requests: sources.map(([name, { url, loadingVariable }]) =>
      [
        `fetch(${jsString(url)})`,
        `${INDENT}.then(response => response.json())`,
        `${INDENT}.then(data => (${name}.value = data))`,
        `${INDENT}.catch(error => console.error(error))`,
        ...(loadingVariable ? [`${INDENT}.finally(() => (${loadingVariable}.value = false))`] : []),
      ].join('\n'),
    ),
    usesComputed: derived.length > 0,
  }
}

function resetFunction(form: ExportedForm, state: Record<string, unknown>): string {
  return [
    `const ${form.ref} = ref(null)`,
    `const ${form.resetName} = () => {`,
    ...form.variables.map(name => `${INDENT}${name}.value = ${jsLiteral(name in state ? state[name] : '', 1)}`),
    `${INDENT}nextTick(() => ${form.ref}.value?.resetValidation())`,
    '}',
  ].join('\n')
}

interface ScriptParts {
  variables: string[]
  state: Record<string, unknown>
  settings: VariableSettings
  context: TemplateContext
  source: StateSource
  prefab?: Prefab
}

function renderScript({ variables, state, settings, context, source, prefab }: ScriptParts): string {
  const { helpers, usage, forms } = context
  const isShared = source === StateSource.Shared && variables.length > 0
  const local = isShared ? null : declarations(variables, state, settings, helpers)
  const localMessages = usage.messages && source === StateSource.Local
  const vueImports = [
    ...(local?.usesComputed ? ['computed'] : []),
    ...(forms.length ? ['nextTick'] : []),
    ...(local?.lines.length || forms.length || localMessages ? ['ref'] : []),
  ]
  const imports = [
    ...(isShared ? ["import { storeToRefs } from 'pinia'"] : []),
    ...(vueImports.length ? [`import { ${vueImports.join(', ')} } from 'vue'`] : []),
    ...(usage.router ? ["import { useRouter } from 'vue-router'"] : []),
    ...(usage.messages && !localMessages ? [MESSAGES_IMPORT] : []),
    ...(isShared ? [STORE_IMPORT] : []),
  ]
  const sections: string[][] = []
  if (imports.length) sections.push(imports)
  if (prefab?.props?.length) {
    const declared = prefab.props.map(
      ({ name, defaultValue }) => `${INDENT}${name}: { type: String, default: ${jsLiteral(defaultValue)} },`,
    )
    sections.push(['const props = defineProps({', ...declared, '})'])
  }
  if (usage.router) sections.push(['const router = useRouter()'])
  if (usage.messages)
    sections.push(
      localMessages
        ? ["const snackbarMessage = ref('')", 'const showMessage = text => (snackbarMessage.value = text)']
        : ['const { show: showMessage } = useMessagesStore()'],
    )
  if (helpers.size) sections.push(helperSources(helpers))
  if (isShared) sections.push([`const { ${variables.join(', ')} } = storeToRefs(useProjectStore())`])
  else if (local?.lines.length) sections.push(local.lines)
  if (local?.requests.length) sections.push(local.requests)
  if (forms.length) sections.push(forms.map(form => resetFunction(form, state)))
  if (!sections.length) return ''
  return `<script setup>\n${sections.map(section => section.join('\n')).join('\n\n')}\n</script>\n\n`
}

function exportTree(
  root: UiNode,
  state: Record<string, unknown>,
  source: StateSource,
  settings: VariableSettings,
  prefab?: Prefab,
): string {
  const used = collectVariables(root)
  const variables = source === StateSource.Shared ? used : declaredVariables(used, settings)
  const context: TemplateContext = {
    known: new Set([...Object.keys(state), ...Object.keys(settings.computed ?? {}), ...variables, ...AMBIENT_NAMES]),
    helpers: new Set(),
    usage: { router: false, messages: false },
    styles: new Set(),
    forms: [],
  }
  const markup = renderNodes([root], context, 1)
  if (context.usage.messages && source === StateSource.Local) markup.push(...SNACKBAR)
  const script = renderScript({ variables, state, settings, context, source, prefab })
  const rules = [styleClassSheet(settings.styleClasses, [root]), ...context.styles].filter(Boolean)
  const styles = rules.length ? `\n<style>\n${rules.join('\n')}\n</style>\n` : ''
  return `${script}<template>\n${markup.join('\n')}\n</template>\n${styles}`
}

/** The page as a Vue single-file component. Variables become `ref`s starting from the project's values. */
export function exportPage(
  page: Page,
  state: Record<string, unknown>,
  fileName: string,
  source = StateSource.Local,
  settings: VariableSettings = {},
): VueFile {
  return { fileName, code: exportTree(page.root, state, source, settings) }
}

/** The shared layout; the place of the page becomes `<RouterView />`. */
export function exportLayout(
  layout: UiNode,
  state: Record<string, unknown>,
  fileName: string,
  source = StateSource.Local,
  settings: VariableSettings = {},
): VueFile {
  return { fileName, code: exportTree(layout, state, source, settings) }
}

/** A saved component; its parameters (`props.name`) become `props` of the file. */
export function exportPrefab(
  prefab: Prefab,
  state: Record<string, unknown>,
  fileName: string,
  source = StateSource.Local,
  settings: VariableSettings = {},
): VueFile {
  return { fileName, code: exportTree(prefab.node, state, source, settings, prefab) }
}

const projectVariables = (roots: UiNode[], state: Record<string, unknown>, settings: VariableSettings) =>
  declaredVariables(
    [...new Set([...Object.keys(state), ...Object.keys(settings.computed ?? {}), ...roots.flatMap(collectVariables)])],
    settings,
  )

/** Variables of a project that exported code cannot declare. */
export function unusableVariableNames(
  roots: UiNode[],
  state: Record<string, unknown>,
  settings: VariableSettings = {},
): string[] {
  return projectVariables(roots, state, settings).filter(name => variableNameError(name) !== null)
}

/** The store of an exported project: every variable the files use, or null when they use none. */
export function exportStore(
  roots: UiNode[],
  state: Record<string, unknown>,
  settings: VariableSettings = {},
): string | null {
  const names = projectVariables(roots, state, settings)
  if (!names.length) return null
  const helpers = new Set<HelperName>()
  const { lines, requests, usesComputed } = declarations(names, state, settings, helpers)
  const indented = (blocks: string[]) => blocks.flatMap(block => block.split('\n').map(line => `${INDENT}${line}`))
  return [
    "import { defineStore } from 'pinia'",
    `import { ${usesComputed ? 'computed, ' : ''}ref } from 'vue'`,
    '',
    ...(helpers.size ? [...helperSources(helpers), ''] : []),
    '/** The variables shared by every page. */',
    "export const useProjectStore = defineStore('project', () => {",
    ...indented(lines),
    ...indented(requests),
    `${INDENT}return { ${names.join(', ')} }`,
    '})',
    '',
  ].join('\n')
}

/** Whether a layout brings its own `VApp`, so the application must not add another around it. */
export const hasAppShell = (layout: UiNode) => [...walkNodes(layout)].some(node => node.type === APP_SHELL_TYPE)

/** Whether any of these elements shows a message, so the application needs a place for it. */
export const showsMessages = (roots: UiNode[]) =>
  roots.some(root =>
    [...walkNodes(root)].some(node =>
      eventEntries(node.events).some(([, actions]) => actions.some(action => action.type === ActionType.Notify)),
    ),
  )
