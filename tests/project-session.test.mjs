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
  assert.equal(await session.readDocument(broken.id), '{oops')
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
