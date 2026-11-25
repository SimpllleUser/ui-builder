import {
  exportLayout,
  exportPage,
  exportPrefab,
  exportStore,
  hasAppShell,
  StateSource,
  type Prefab,
  type Project,
} from '../../../entities/ui-node'
import { toPascalCase } from '../../../../../shared/lib/pascalCase'
import { mainSource, packageJson, readme, routerSource, scaffoldFiles } from './vueProjectScaffold'

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

const packageName = (name: string) =>
  name
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
  const roots = [
    ...project.pages.map(page => page.root),
    ...(project.layout ? [project.layout] : []),
    ...prefabs.map(prefab => prefab.node),
  ]
  const store = exportStore(roots, project.state)
  const files: Record<string, string> = {}

  const pageName = fileNamer('Page')
  const routes = project.pages.map(page => {
    const file = pageName(page.name)
    files[`src/pages/${file}`] = exportPage(page, project.state, file, StateSource.Shared).code
    return { path: page.path, file }
  })
  if (project.layout) {
    files[`src/layouts/${LAYOUT_FILE}`] = exportLayout(
      project.layout,
      project.state,
      LAYOUT_FILE,
      StateSource.Shared,
    ).code
  }
  const componentName = fileNamer('Component')
  for (const prefab of prefabs) {
    const file = componentName(prefab.name)
    files[`src/components/${file}`] = exportPrefab(prefab, project.state, file, StateSource.Shared).code
  }

  const styles = [...(themeCss ? ['theme.css'] : []), 'tables.css']
  if (themeCss) files['src/styles/theme.css'] = `${themeCss}\n`
  files['src/styles/tables.css'] = tableCss
  if (store) files['src/stores/project.js'] = store
  files['src/plugins/vuetify.js'] = vuetifyConfig
  files['src/router/index.js'] = routerSource(routes)
  files['src/App.vue'] = appComponent(project)
  files['src/main.js'] = mainSource(styles, store !== null)
  files['package.json'] = packageJson(name, themeCss, store !== null)
  files['README.md'] = readme(sources.name)
  Object.assign(files, scaffoldFiles(sources.name))
  return { name, files }
}
