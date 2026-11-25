import {
  exportLayout,
  exportPage,
  exportPrefab,
  exportStore,
  hasAppShell,
  showsMessages,
  StateSource,
  unusableVariableNames,
  type Prefab,
  type Project,
} from '../../../entities/ui-node'
import { toPascalCase } from '../../../../../shared/lib/pascalCase'
import { transliterate } from '../../../../../shared/lib/transliterate'
import {
  mainSource,
  messagesStoreSource,
  mockFiles,
  packageJson,
  readme,
  routerSource,
  scaffoldFiles,
  withMessages,
} from './vueProjectScaffold'

export interface VueProjectSources {
  name: string
  project: Project
  prefabs: Prefab[]
  /** The `vuetify.js` that sets the project's theme. */
  vuetifyConfig: string
  /** Style rules of the theme; empty when it needs none. */
  themeCss: string
  /** Looks of data tables that Vuetify has no prop for. */
  tableCss: string
}

export interface ExportedProject {
  /** Folder name, also the package name. */
  name: string
  /** Path inside the folder to file content. */
  files: Record<string, string>
}

const LAYOUT_FILE = 'AppLayout.vue'

/** Why the project cannot be exported yet; the message is for the person. */
export class ExportBlockedError extends Error {}

const rootsOf = (project: Project, prefabs: Prefab[]) => [
  ...project.pages.map(page => page.root),
  ...(project.layout ? [project.layout] : []),
  ...prefabs.map(prefab => prefab.node),
]

/** What to rename before the exported code can run, or null when nothing. */
export function namingProblem(project: Project, prefabs: Prefab[]): string | null {
  const names = unusableVariableNames(rootsOf(project, prefabs), project.state, project)
  if (!names.length) return null
  const listed = names.map(name => `“${name}”`).join(', ')
  return `Rename these variables, code cannot use their names: ${listed}.`
}

const packageName = (name: string) =>
  transliterate(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'ui-project'

/** `OrderDesk.vue`, then `OrderDesk2.vue`, unique within one folder. */
function fileNamer(fallback: string) {
  const taken = new Set<string>()
  return (title: string) => {
    const base = toPascalCase(title).replace(/^(?=\d)/, fallback) || fallback
    let name = base
    for (let copy = 2; taken.has(name.toLowerCase()); copy++) name = `${base}${copy}`
    taken.add(name.toLowerCase())
    return `${name}.vue`
  }
}

function appComponent(project: Project): string {
  if (!project.layout)
    return '<template>\n  <VApp>\n    <VMain>\n      <RouterView />\n    </VMain>\n  </VApp>\n</template>\n'
  const script = "<script setup>\nimport AppLayout from './layouts/AppLayout.vue'\n</script>\n\n"
  const template = hasAppShell(project.layout)
    ? '<template>\n  <AppLayout />\n</template>\n'
    : '<template>\n  <VApp>\n    <VMain>\n      <AppLayout />\n    </VMain>\n  </VApp>\n</template>\n'
  return script + template
}

/** A whole Vue application of the project, ready for `npm install` and `npm run dev`. */
export function buildVueProject(sources: VueProjectSources): ExportedProject {
  const { project, prefabs, vuetifyConfig, themeCss, tableCss } = sources
  const name = packageName(sources.name)
  const problem = namingProblem(project, prefabs)
  if (problem) throw new ExportBlockedError(problem)
  const roots = rootsOf(project, prefabs)
  const store = exportStore(roots, project.state, project)
  const messages = showsMessages(roots)
  const usesPinia = store !== null || messages
  const files: Record<string, string> = {}

  const pageName = fileNamer('Page')
  const routes = project.pages.map(page => {
    const file = pageName(page.name)
    files[`src/pages/${file}`] = exportPage(page, project.state, file, StateSource.Shared, project).code
    return { path: page.path, file }
  })
  if (project.layout) {
    files[`src/layouts/${LAYOUT_FILE}`] = exportLayout(
      project.layout,
      project.state,
      LAYOUT_FILE,
      StateSource.Shared,
      project,
    ).code
  }
  const componentName = fileNamer('Component')
  for (const prefab of prefabs) {
    const file = componentName(prefab.name)
    files[`src/components/${file}`] = exportPrefab(prefab, project.state, file, StateSource.Shared, project).code
  }

  const styles = [...(themeCss ? ['theme.css'] : []), 'tables.css']
  if (themeCss) files['src/styles/theme.css'] = `${themeCss}\n`
  files['src/styles/tables.css'] = tableCss
  if (store) files['src/stores/project.js'] = store
  files['src/plugins/vuetify.js'] = vuetifyConfig
  files['src/router/index.js'] = routerSource(routes)
  files['src/App.vue'] = messages ? withMessages(appComponent(project)) : appComponent(project)
  if (messages) files['src/stores/messages.js'] = messagesStoreSource
  for (const [name, source] of Object.entries(project.sources ?? {}))
    Object.assign(files, mockFiles(source.url, project.state[name]))
  files['src/main.js'] = mainSource(styles, usesPinia)
  files['package.json'] = packageJson(name, themeCss, usesPinia)
  files['README.md'] = readme(sources.name)
  Object.assign(files, scaffoldFiles(sources.name))
  return { name, files }
}
