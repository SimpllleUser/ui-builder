// Shared setup of the editor tests: a Vite server to load the sources, and a fresh store for every test.
// The variables are live bindings, so a test file can import them and always sees the current store.
import { before, after, beforeEach, afterEach } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'
export let server,
  useStore,
  parseProject,
  serializeProject,
  runtime,
  parseDocument,
  serializeDocument,
  readSpacing,
  writeSpacing,
  readFlex,
  writeFlex,
  groupNodes,
  ungroupNode,
  clonePaletteItem,
  parseMoveDestination,
  canSavePrefabName,
  store
const storage = new Map()
before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true, watch: null, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    // The tests never draw anything, so components come from an empty stand-in instead of loading Vuetify in Node.
    resolve: {
      alias: { 'vuetify/components': fileURLToPath(new URL('./vuetify-components.stub.mjs', import.meta.url)) },
    },
  })
  ;({ useUiTreeStore: useStore } = await server.ssrLoadModule(
    '/src/modules/ui-builder/entities/ui-node/model/store.ts',
  ))
  ;({ parseProject, serializeProject } = await server.ssrLoadModule(
    '/src/modules/ui-builder/entities/ui-node/model/document.ts',
  ))
  runtime = await server.ssrLoadModule('/src/modules/ui-builder/entities/ui-node/model/runtime.ts')
  // Single-page helpers: tests edit one page tree and import it as a v1 document (also exercises migration).
  parseDocument = text => parseProject(text).pages[0].root
  serializeDocument = root => JSON.stringify({ version: 1, root })
  ;({ readSpacing, writeSpacing, readFlex, writeFlex } = await server.ssrLoadModule(
    '/src/modules/ui-builder/entities/ui-node/model/layoutControls.ts',
  ))
  ;({ groupNodes, ungroupNode } = await server.ssrLoadModule('/src/features/ui-builder/model/treeOperations.ts'))
  ;({ clonePaletteItem } = await server.ssrLoadModule('/src/features/ui-builder/model/useClone.ts'))
  ;({ parseMoveDestination, canSavePrefabName } = await server.ssrLoadModule(
    '/src/modules/ui-builder/widgets/property-panel/model/propertyPanelUtils.ts',
  ))
  global.window = { localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) } }
})
beforeEach(() => {
  storage.clear()
  setActivePinia(createPinia())
  store = useStore()
})
afterEach(() => store.$dispose())
after(async () => {
  delete global.window
  await server.close()
})
