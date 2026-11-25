import { test, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { IDBFactory } from 'fake-indexeddb'

let server, useStore, projects, createProjectSession, store, repository, theme, values, session

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true, watch: null, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    resolve: {
      alias: { 'vuetify/components': fileURLToPath(new URL('./vuetify-components.stub.mjs', import.meta.url)) },
    },
  })
  const load = path => server.ssrLoadModule(path)
  ;({ useUiTreeStore: useStore } = await load('/src/modules/ui-builder/entities/ui-node/model/store.ts'))
  projects = await load('/src/modules/projects/entities/project/index.ts')
  ;({ createProjectSession } = await load('/src/modules/projects/features/manage-projects/model/projectSession.ts'))
})
beforeEach(async () => {
  setActivePinia(createPinia())
  store = useStore()
  repository = await projects.openProjectRepository(new IDBFactory())
  theme = ref(null)
  values = new Map()
  listeners = []
  locks = fakeLocks()
  session = newSession()
})
afterEach(() => {
  store.$dispose()
  repository.close()
})
after(() => server.close())

const memoryStorage = map => ({
  getItem: key => map.get(key) ?? null,
  setItem: (key, value) => map.set(key, value),
  removeItem: key => map.delete(key),
})
/** Delivers a message to every other tab, as BroadcastChannel does. */
let listeners
const channel = () => {
  let own
  return {
    post: message => listeners.filter(listener => listener !== own).forEach(listener => listener(message)),
    subscribe: listener => {
      own = listener
      listeners.push(listener)
    },
  }
}
/** Web Locks shared by all tabs of a test. A wait gives up quickly, as the real timeout would later. */
const fakeLocks = () => {
  const holders = new Map()
  const waiting = new Map()
  const grant = (name, onStolen) => {
    const holder = { onStolen }
    holders.set(name, holder)
    return {
      release: () => {
        if (holders.get(name) !== holder) return
        holders.delete(name)
        waiting.get(name)?.()
      },
    }
  }
  return {
    tryAcquire: async (name, onStolen) => (holders.has(name) ? null : grant(name, onStolen)),
    waitFor: (name, _timeout, onStolen) =>
      new Promise(resolve => {
        if (!holders.has(name)) return resolve(grant(name, onStolen))
        const timer = setTimeout(() => resolve(null), 50)
        waiting.set(name, () => {
          clearTimeout(timer)
          resolve(grant(name, onStolen))
        })
      }),
    steal: async (name, onStolen) => {
      holders.get(name)?.onStolen()
      return grant(name, onStolen)
    },
  }
}
/** What a browser without Web Locks gives: the revision check is then the only protection. */
const noLocks = () => ({
  tryAcquire: async () => ({ release() {} }),
  waitFor: async () => ({ release() {} }),
  steal: async () => ({ release() {} }),
})
let locks
const newSession = (editor = store, tab = new Map()) =>
  createProjectSession({
    repository,
    store: editor,
    theme: editor === store ? theme : ref(null),
    browserStorage: memoryStorage(values),
    tabStorage: memoryStorage(tab),
    channel: channel(),
    locks,
  })
const emptyDocument = () => store.exportDocument()
const create = (name, document = emptyDocument()) => repository.createProject({ name, document })
const elements = async id => JSON.parse(await repository.readDocument(id)).pages[0].root.children.length

test('a new browser gets one empty project, and the next start opens it again', async () => {
  await session.start()
  const [first] = await repository.listProjects()
  assert.equal(first.name, 'My project')
  assert.equal(session.currentProjectId.value, first.id)
  await newSession().start()
  assert.equal((await repository.listProjects()).length, 1)
})

test('a change made just before switching is saved in the project it was made in', async () => {
  const shop = await create('Shop')
  const blog = await create('Blog')
  await session.open(shop.id)
  store.addComponent('VBtn')
  assert.equal(await session.open(blog.id), true)

  assert.equal(await elements(shop.id), 1)
  assert.equal(await elements(blog.id), 0)
  assert.equal(store.rootNode.children.length, 0)
  assert.equal(store.canUndo, false, 'history does not cross projects')
})

test('checkpoints and the theme stay with their project', async () => {
  const shop = await create('Shop')
  const blog = await create('Blog')
  await session.open(shop.id)
  store.createCheckpoint('Shop start')
  theme.value = 'shop theme'
  await session.open(blog.id)
  assert.equal(store.checkpoints.length, 0)
  assert.equal(theme.value, null)

  await session.open(shop.id)
  assert.equal(store.checkpoints[0].name, 'Shop start')
  assert.equal(theme.value, 'shop theme')
})

test('of two quick switches the later one wins', async () => {
  const shop = await create('Shop')
  const blog = await create('Blog')
  const results = await Promise.all([session.open(shop.id), session.open(blog.id)])
  assert.deepEqual(results, [false, true])
  assert.equal(session.currentProjectId.value, blog.id)
})

test('a damaged project is not opened and not overwritten', async () => {
  const shop = await create('Shop')
  const broken = await create('Broken', '{oops')
  await session.open(shop.id)
  store.addComponent('VBtn')
  assert.equal(await session.open(broken.id), false)

  assert.equal(session.currentProjectId.value, shop.id)
  assert.equal(store.rootNode.children.length, 1)
  assert.equal(await repository.readDocument(broken.id), '{oops')
})

test('a project that cannot be saved is not left', async () => {
  const shop = await create('Shop')
  const blog = await create('Blog')
  await session.open(shop.id)
  await repository.deleteProject(shop.id)
  store.addComponent('VBtn')

  assert.equal(await session.open(blog.id), false)
  assert.equal(store.rootNode.children.length, 1)
})

const names = () => session.projects.value.map(project => project.name).sort()

test('a created project is opened, and a copy includes the latest change', async () => {
  await session.start()
  assert.equal(await session.create('Shop'), true)
  assert.equal(session.currentProject.value.name, 'Shop')
  await assert.rejects(session.create('shop'), /already has this name/)

  store.addComponent('VBtn')
  await session.duplicate(session.currentProjectId.value)
  assert.deepEqual(names(), ['My project', 'Shop', 'Shop copy'])
  const copy = session.projects.value.find(project => project.name === 'Shop copy')
  assert.equal(await elements(copy.id), 1)
})

test('deleting the open project opens another, and deleting the last one leaves an empty one', async () => {
  await session.start()
  await session.create('Shop')
  store.addComponent('VBtn')
  await session.remove(session.currentProjectId.value)
  assert.deepEqual(names(), ['My project'])
  assert.equal(store.rootNode.children.length, 0)

  const last = session.currentProjectId.value
  await session.remove(last)
  assert.equal(session.projects.value.length, 1)
  assert.notEqual(session.currentProjectId.value, last)
})

test('deleting another project leaves the open one alone', async () => {
  const shop = await create('Shop')
  const blog = await create('Blog')
  await session.open(shop.id)
  await session.remove(blog.id)
  assert.equal(session.currentProjectId.value, shop.id)
  assert.deepEqual(names(), ['Shop'])
})

test('the list counts pages and marks a damaged project, whose text can still be taken out', async () => {
  await create('Shop')
  const broken = await create('Broken', '{oops')
  const details = await session.listDetails()
  assert.deepEqual(Object.fromEntries(details.map(item => [item.name, item.pageCount])), { Shop: 1, Broken: null })
  assert.equal(await session.exportFile(broken.id), '{oops')
  assert.equal(projects.projectFileName('a/b: c?'), 'a-b- c-.json')
})

test('an imported file becomes a new project and the open one stays as it was', async () => {
  await session.start()
  const first = session.currentProjectId.value
  store.addComponent('VBtn')
  const exported = store.exportDocument()
  store.addComponent('VCard', 'root-canvas')

  assert.equal(await session.importProject('Shop.json', exported), 'Shop')
  assert.equal(session.currentProject.value.name, 'Shop')
  assert.equal(store.rootNode.children.length, 1)
  assert.equal(await elements(first), 2)
  assert.equal(await session.importProject('shop.JSON', exported), 'shop 2')
})

test('an invalid file creates no project', async () => {
  await session.start()
  const first = session.currentProjectId.value
  await assert.rejects(session.importProject('broken.json', '{oops'))
  assert.equal((await repository.listProjects()).length, 1)
  assert.equal(session.currentProjectId.value, first)
})

/** A second tab: its own editor and session over the same browser storage. */
const secondTab = async () => {
  const editor = useStore(createPinia())
  const other = newSession(editor)
  await other.start()
  return { editor, other }
}

test('a tab reopens its own project, and a new tab the one used last', async () => {
  const shop = await create('Shop')
  const blog = await create('Blog')
  const tab = new Map()
  await newSession(store, tab).open(shop.id)
  await session.open(blog.id)

  const reloaded = newSession(useStore(createPinia()), tab)
  await reloaded.start()
  assert.equal(reloaded.currentProjectId.value, shop.id)
  const { other } = await secondTab()
  assert.equal(other.currentProjectId.value, shop.id, 'the reload above was the last use')
})

test('a tab left behind does not overwrite what another tab saved', async () => {
  locks = noLocks()
  session = newSession()
  await session.start()
  const id = session.currentProjectId.value
  const { editor, other } = await secondTab()
  editor.addComponent('VBtn')
  await editor.flush()
  assert.equal(session.conflict.value, 'changed')
  assert.equal(other.conflict.value, null)

  store.addComponent('VCard')
  await store.flush()
  assert.equal(store.saveState, 'error')
  assert.match(store.notice, /changed in another tab/)
  assert.equal(await elements(id), 1)

  assert.equal(await session.reloadCurrent(), true)
  assert.equal(session.conflict.value, null)
  assert.equal(store.rootNode.children[0].type, 'VBtn')
  assert.equal(store.saveState, 'saved')
  editor.$dispose()
})

test('the changes of a tab left behind can be kept as a copy', async () => {
  locks = noLocks()
  session = newSession()
  await session.start()
  const id = session.currentProjectId.value
  const { editor } = await secondTab()
  editor.addComponent('VBtn')
  await editor.flush()
  store.addComponent('VCard')
  store.addComponent('VBtn', 'root-canvas')

  assert.equal(await session.saveAsCopy(), true)
  assert.equal(session.currentProject.value.name, 'My project copy')
  assert.equal(await elements(session.currentProjectId.value), 2)
  assert.equal(await elements(id), 1)
  editor.$dispose()
})

test('a project deleted in another tab is not written back', async () => {
  locks = noLocks()
  session = newSession()
  await session.start()
  const id = session.currentProjectId.value
  const { editor, other } = await secondTab()
  await other.remove(id)
  assert.equal(session.conflict.value, 'deleted')

  store.addComponent('VBtn')
  await store.flush()
  assert.equal(await repository.readDocument(id), null)
  await session.leaveDeleted()
  assert.notEqual(session.currentProjectId.value, id)
  assert.equal(session.conflict.value, null)
  assert.equal(store.saveState, 'saved')
  editor.$dispose()
})

test('the exported file carries the theme, and importing it brings the theme back', async () => {
  await session.start()
  const first = session.currentProjectId.value
  store.addComponent('VBtn')
  theme.value = '{"mode":"dark"}'
  const file = await session.exportFile(first)
  assert.deepEqual(JSON.parse(file).theme, { mode: 'dark' })

  await session.create('Other')
  assert.equal(theme.value, null)
  assert.equal(await session.exportFile(first), file, 'the same for a project that is not open')

  await session.importProject('Copy.json', file)
  assert.equal(theme.value, '{"mode":"dark"}')
  assert.equal(store.rootNode.children.length, 1)
  assert.equal('theme' in JSON.parse(await repository.readDocument(session.currentProjectId.value)), false)

  await session.importProject('Plain.json', store.exportDocument())
  assert.equal(theme.value, null)
})

test('a damaged project is exported as it was saved', async () => {
  const broken = await repository.createProject({ name: 'Broken', document: '{oops', preferences: { theme: '{}' } })
  assert.equal(await session.exportFile(broken.id), '{oops')
})

const settle = () => new Promise(resolve => setTimeout(resolve, 20))

test('a second tab is locked out until the first hands the project over, with its changes', async () => {
  await session.start()
  const { editor, other } = await secondTab()
  assert.equal(session.isLocked.value, false)
  assert.equal(other.isLocked.value, true)

  store.addComponent('VBtn')
  assert.equal(await other.editHere(), true)
  assert.equal(other.isLocked.value, false)
  assert.equal(session.isLocked.value, true)
  assert.equal(editor.rootNode.children.length, 1, 'the change made just before is there')

  store.addComponent('VCard', 'root-canvas')
  await store.flush()
  assert.equal(store.saveState, 'error', 'the tab that let go no longer writes')
  assert.equal(await elements(other.currentProjectId.value), 1)
  editor.$dispose()
})

test('a project another tab edits is not deleted, and switching away frees the lock', async () => {
  await session.start()
  const first = session.currentProjectId.value
  const { editor, other } = await secondTab()
  await assert.rejects(other.remove(first), /open in another tab/)

  await session.create('Shop')
  assert.equal(await other.editHere(), true)
  await assert.rejects(session.remove(first), /open in another tab/)
  editor.$dispose()
})

test('a tab that does not answer can be taken over', async () => {
  await session.start()
  const { editor, other } = await secondTab()
  listeners.splice(0, 1)

  assert.equal(await other.editHere(), false)
  assert.equal(other.isLocked.value, true)
  assert.equal(await other.editHere('force'), true)
  await settle()
  assert.equal(session.isLocked.value, true)
  assert.equal(other.isLocked.value, false)
  editor.$dispose()
})

test('the lock adapter works with the real Web Locks API', { skip: !globalThis.navigator?.locks }, async () => {
  const { createTabLocks } = await server.ssrLoadModule('/src/shared/lib/webLocks.ts')
  const tabs = createTabLocks()
  let stolen = false
  const first = await tabs.tryAcquire('lock-test', () => (stolen = true))
  assert.ok(first)
  assert.equal(await tabs.tryAcquire('lock-test', () => {}), null)
  assert.equal(await tabs.waitFor('lock-test', 20, () => {}), null)

  const second = await tabs.steal('lock-test', () => {})
  await settle()
  assert.equal(stolen, true)
  second.release()
  const third = await tabs.waitFor('lock-test', 1000, () => {})
  assert.ok(third)
  third.release()
})

const themeStub = {
  describe: () => ({ settings: { radius: null } }),
  change: patch => ({ settings: patch }),
}

const mcpTab = async () => {
  const { createMcpHost } = await server.ssrLoadModule('/src/app/shell/mcpHost.ts')
  const { runMcpCommand } = await server.ssrLoadModule(
    '/src/modules/ui-builder/features/mcp-bridge/model/mcpProjectCommands.ts',
  )
  return (editor, projectSession, command, args) =>
    runMcpCommand(
      editor,
      createMcpHost(projectSession, () => editor.notice, themeStub),
      command,
      args,
    )
}

test('an agent can list, create, rename and open projects, and sees which one it edits', async () => {
  const run = await mcpTab()
  await session.start()
  const first = session.currentProjectId.value
  const shop = await run(store, session, 'create_project', { name: 'Shop' })
  assert.deepEqual(shop, { id: session.currentProjectId.value, name: 'Shop', lockedElsewhere: false })
  assert.deepEqual((await run(store, session, 'get_status')).project, { id: shop.id, name: 'Shop' })
  assert.equal((await run(store, session, 'list_projects')).projects.length, 2)
  await run(store, session, 'rename_project', { id: 'Shop', name: 'Store' })
  assert.equal((await run(store, session, 'open_project', { id: first })).id, first)
  assert.equal((await run(store, session, 'open_project', { id: 'Store' })).id, shop.id)
  await assert.rejects(run(store, session, 'open_project', { id: 'nope' }), /No project nope/)
  await assert.rejects(run(store, session, 'create_project', { name: 'Store' }), /already has this name/)
  await assert.rejects(
    run(store, session, 'batch', { steps: [{ tool: 'create_project', args: { name: 'x' } }] }),
    /cannot be used in a batch/,
  )
})

test('an agent in a locked tab cannot edit, but can move to a free project', async () => {
  const run = await mcpTab()
  await session.start()
  const { editor, other } = await secondTab()
  await assert.rejects(run(editor, other, 'add_component', { type: 'VBtn' }), /open in another tab/)
  const created = await run(editor, other, 'create_project', { name: 'Agent' })
  assert.equal(created.lockedElsewhere, false)
  await run(editor, other, 'add_component', { type: 'VBtn' })
  assert.equal(editor.rootNode.children.length, 1)
  editor.$dispose()
})

test('a locked tab shows what the editing tab saves, and writes nothing', async () => {
  await session.start()
  const id = session.currentProjectId.value
  const { editor, other } = await secondTab()
  store.addComponent('VBtn')
  await store.flush()
  await settle()

  assert.equal(other.isLocked.value, true)
  assert.equal(editor.rootNode.children.length, 1)
  assert.equal(editor.saveState, 'saved')
  assert.equal(await elements(id), 1)
  editor.$dispose()
})

test('export_document and import_document carry the theme', async () => {
  const run = await mcpTab()
  await session.start()
  theme.value = '{"mode":"dark"}'
  const file = await run(store, session, 'export_document')
  assert.deepEqual(JSON.parse(file).theme, { mode: 'dark' })

  theme.value = null
  await run(store, session, 'import_document', { json: file })
  assert.equal(theme.value, '{"mode":"dark"}')
  await run(store, session, 'import_document', { json: store.exportDocument() })
  assert.equal(theme.value, '{"mode":"dark"}', 'a file without a theme keeps the current one')
})

test('theme tools reach the application, and are refused where the project cannot be edited', async () => {
  const run = await mcpTab()
  await session.start()
  assert.deepEqual(await run(store, session, 'get_theme'), { settings: { radius: null } })
  assert.deepEqual(await run(store, session, 'set_theme', { settings: { radius: 8 } }), { settings: { radius: 8 } })
  await assert.rejects(run(store, session, 'batch', { steps: [{ tool: 'set_theme' }] }), /cannot be used in a batch/)
})
