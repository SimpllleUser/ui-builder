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
  ;({ createProjectSession } = await load('/src/modules/projects/features/open-project/model/projectSession.ts'))
})
beforeEach(async () => {
  setActivePinia(createPinia())
  store = useStore()
  repository = await projects.openProjectRepository(new IDBFactory())
  theme = ref(null)
  values = new Map()
  session = newSession()
})
afterEach(() => {
  store.$dispose()
  repository.close()
})
after(() => server.close())

const newSession = () =>
  createProjectSession({
    repository,
    store,
    theme,
    browserStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
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
