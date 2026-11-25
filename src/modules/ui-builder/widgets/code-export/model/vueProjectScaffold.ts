/** The files of an exported project that do not depend on what its pages contain. */

const VERSIONS = {
  '@mdi/font': '7.4.47',
  pinia: '^3.0.3',
  vue: '^3.5.21',
  'vue-router': '^4.5.0',
  vuetify: '^3.10.1',
}
const DEV_VERSIONS = {
  '@vitejs/plugin-vue': '^6.0.1',
  vite: '^7.1.5',
  'vite-plugin-vuetify': '^2.1.2',
}
const FONT_VERSION = '^5.3.0'
const FONT_IMPORT = /@fontsource-variable\/[a-z0-9-]+/g

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`
const escapeHtml = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

export function packageJson(name: string, themeCss: string, usesStore: boolean): string {
  const fonts = [...new Set(themeCss.match(FONT_IMPORT) ?? [])].map(font => [font, FONT_VERSION])
  const dependencies = Object.entries(VERSIONS).filter(([dependency]) => usesStore || dependency !== 'pinia')
  return json({
    name,
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
    dependencies: Object.fromEntries([...dependencies, ...fonts].sort()),
    devDependencies: DEV_VERSIONS,
  })
}

export function routerSource(routes: Array<{ path: string; file: string }>): string {
  const lines = routes.map(({ path, file }) => `    { path: '${path}', component: () => import('../pages/${file}') },`)
  // An address no page has, including "/" when no page uses it, leads to the first page.
  lines.push(`    { path: '/:unknown(.*)*', redirect: '${routes[0].path}' },`)
  return [
    "import { createRouter, createWebHistory } from 'vue-router'",
    '',
    'export default createRouter({',
    '  history: createWebHistory(),',
    '  routes: [',
    ...lines,
    '  ],',
    '})',
    '',
  ].join('\n')
}

export function mainSource(styles: string[], usesStore: boolean): string {
  return [
    "import '@mdi/font/css/materialdesignicons.css'",
    "import 'vuetify/styles'",
    ...styles.map(style => `import './styles/${style}'`),
    ...(usesStore ? ["import { createPinia } from 'pinia'"] : []),
    "import { createApp } from 'vue'",
    "import App from './App.vue'",
    "import vuetify from './plugins/vuetify'",
    "import router from './router'",
    '',
    `createApp(App)${usesStore ? '.use(createPinia())' : ''}.use(router).use(vuetify).mount('#app')`,
    '',
  ].join('\n')
}

export const messagesStoreSource = [
  "import { defineStore } from 'pinia'",
  "import { ref } from 'vue'",
  '',
  '/** The message the application shows at the bottom of the screen. */',
  "export const useMessagesStore = defineStore('messages', () => {",
  "  const text = ref('')",
  '  const show = message => (text.value = message)',
  '  return { text, show }',
  '})',
  '',
].join('\n')

const MESSAGES_IMPORT = "import { useMessagesStore } from './stores/messages'"
const MESSAGES_SETUP = 'const messages = useMessagesStore()'
const SNACKBAR = [
  '  <VSnackbar :model-value="!!messages.text" @update:model-value="messages.text = \'\'">',
  '    {{ messages.text }}',
  '  </VSnackbar>',
  '</template>',
  '',
].join('\n')

/** The application component with the place where messages appear. It outlives the pages, so a message survives navigation. */
export function withMessages(app: string): string {
  const body = app.replace(/<\/template>\n$/, SNACKBAR)
  if (!body.startsWith('<script setup>'))
    return `<script setup>\n${MESSAGES_IMPORT}\n\n${MESSAGES_SETUP}\n</script>\n\n${body}`
  return body
    .replace('<script setup>\n', `<script setup>\n${MESSAGES_IMPORT}\n`)
    .replace('\n</script>', `\n\n${MESSAGES_SETUP}\n</script>`)
}

/**
 * The mock answer of a data source as a file the development server serves, so the exported application has data
 * before there is a backend. Web addresses and paths that name no file get none.
 */
export function mockFiles(url: string, data: unknown): Record<string, string> {
  const isFile = url.startsWith('/') && !url.endsWith('/') && !url.includes('..')
  return isFile ? { [`public${url}`]: json(data) } : {}
}

export const readme = (title: string) =>
  [
    `# ${title}`,
    '',
    'Exported from UI Builder: Vue 3, Vuetify, Vue Router and Pinia.',
    '',
    '```sh',
    'npm install',
    'npm run dev',
    '```',
    '',
    '- `src/pages` holds one file per page; their routes are in `src/router`.',
    '- `src/stores/project.js` holds the variables the pages share.',
    '- `src/components` holds the saved components. Copies placed on pages are written into the pages themselves.',
    '- Input masks are not exported.',
    '- Files in `public` answer the mock data sources; point the `fetch` calls at your backend when there is one.',
    '',
    'Changes made here do not go back into the editor.',
    '',
  ].join('\n')

export const scaffoldFiles = (title: string): Record<string, string> => ({
  'index.html': [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="UTF-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `    <title>${escapeHtml(title)}</title>`,
    '  </head>',
    '  <body>',
    '    <div id="app"></div>',
    '    <script type="module" src="/src/main.js"></script>',
    '  </body>',
    '</html>',
    '',
  ].join('\n'),
  'vite.config.js': [
    "import vue from '@vitejs/plugin-vue'",
    "import { defineConfig } from 'vite'",
    "import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'",
    '',
    'export default defineConfig({',
    '  plugins: [vue({ template: { transformAssetUrls } }), vuetify({ autoImport: true })],',
    '})',
    '',
  ].join('\n'),
  '.gitignore': 'node_modules\ndist\n',
})
