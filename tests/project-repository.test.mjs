import { test, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { IDBFactory } from 'fake-indexeddb'

let server, projects, repository

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true, watch: null, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
  })
  projects = await server.ssrLoadModule('/src/modules/projects/entities/project/index.ts')
})
beforeEach(async () => {
  repository = await projects.openProjectRepository(new IDBFactory())
})
afterEach(() => repository.close())
after(() => server.close())

const create = (name, document = '{}') => repository.createProject({ name, document })
const names = async () => (await repository.listProjects()).map(project => project.name).sort()
const checkpoint = (checkpointId, createdAt = 1) => ({ checkpointId, name: checkpointId, createdAt, snapshot: '{}' })
const legacyStorage = values => {
  const items = { ...values }
  return { items, getItem: key => items[key] ?? null, removeItem: key => delete items[key] }
}
const legacyValues = {
  'ui-builder:document:v1': '{"pages":[]}',
  'ui-builder:active-page': 'page_1',
  'ui-builder-theme-settings': '{"mode":"dark"}',
  'ui-builder:history-checkpoints': JSON.stringify([checkpoint('first'), { broken: true }]),
}

test('each project keeps its own document, preferences and checkpoints', async () => {
  const shop = await create('Shop', 'shop document')
  const blog = await create('Blog', 'blog document')
  await repository.saveDocument(shop.id, 'changed shop')
  await repository.updatePreferences(shop.id, { activePageId: 'page_2' })
  await repository.updatePreferences(shop.id, { theme: 'dark' })
  await repository.saveCheckpoint(shop.id, checkpoint('same-id', 1))
  await repository.saveCheckpoint(blog.id, checkpoint('same-id', 2))
  await repository.saveCheckpoint(shop.id, checkpoint('newer', 3))

  assert.equal(await repository.readDocument(shop.id), 'changed shop')
  assert.equal(await repository.readDocument(blog.id), 'blog document')
  assert.deepEqual(await repository.readPreferences(shop.id), { activePageId: 'page_2', theme: 'dark' })
  assert.deepEqual(await repository.readPreferences(blog.id), { activePageId: null, theme: null })
  assert.deepEqual(await repository.listCheckpoints(shop.id), [checkpoint('newer', 3), checkpoint('same-id', 1)])
  assert.deepEqual(await repository.listCheckpoints(blog.id), [checkpoint('same-id', 2)])

  await repository.deleteCheckpoint(shop.id, 'same-id')
  assert.equal((await repository.listCheckpoints(shop.id)).length, 1)
  assert.equal((await repository.listCheckpoints(blog.id)).length, 1)
})

test('a name must be filled in, short enough and not taken', async () => {
  const shop = await create(' Shop ')
  assert.equal(shop.name, 'Shop')
  await assert.rejects(create('shop'), /already has this name/)
  await assert.rejects(create('  '), /Enter a name/)
  await assert.rejects(create('x'.repeat(61)), /at most 60/)
  await create('Blog')
  await assert.rejects(repository.renameProject(shop.id, 'BLOG'), /already has this name/)
  assert.equal((await repository.renameProject(shop.id, 'SHOP')).name, 'SHOP')
  assert.deepEqual(await names(), ['Blog', 'SHOP'])
})

test('a copy has its own content and no checkpoints', async () => {
  const shop = await create('Shop', 'shop document')
  await repository.saveCheckpoint(shop.id, checkpoint('first'))
  const copy = await repository.duplicateProject(shop.id)
  const second = await repository.duplicateProject(shop.id)

  assert.equal(copy.name, 'Shop copy')
  assert.equal(second.name, 'Shop copy 2')
  assert.equal(await repository.readDocument(copy.id), 'shop document')
  assert.deepEqual(await repository.listCheckpoints(copy.id), [])
})

test('deleting removes everything, and a late save does not bring it back', async () => {
  const shop = await create('Shop')
  await repository.saveCheckpoint(shop.id, checkpoint('first'))
  await repository.deleteProject(shop.id)

  await assert.rejects(repository.saveDocument(shop.id, 'late'), /no longer exists/)
  await assert.rejects(repository.updatePreferences(shop.id, { theme: 'dark' }), /no longer exists/)
  await assert.rejects(repository.saveCheckpoint(shop.id, checkpoint('late')), /no longer exists/)
  assert.deepEqual(await names(), [])
  assert.equal(await repository.readDocument(shop.id), null)
  assert.deepEqual(await repository.listCheckpoints(shop.id), [])
})

test('the old single project becomes the first project, once', async () => {
  const storage = legacyStorage(legacyValues)
  const imported = await projects.migrateLegacyProject(repository, storage)

  assert.equal(imported.name, projects.LEGACY_PROJECT_NAME)
  assert.equal(await repository.readDocument(imported.id), '{"pages":[]}')
  assert.deepEqual(await repository.readPreferences(imported.id), {
    activePageId: 'page_1',
    theme: '{"mode":"dark"}',
  })
  assert.deepEqual(await repository.listCheckpoints(imported.id), [checkpoint('first')])

  await repository.deleteProject(imported.id)
  assert.equal(await projects.migrateLegacyProject(repository, storage), null)
  assert.deepEqual(await names(), [])
})

test('nothing is imported into a new browser, and a damaged document is kept as it is', async () => {
  assert.equal(await projects.migrateLegacyProject(repository, legacyStorage({})), null)
  assert.deepEqual(await names(), [])

  const other = await projects.openProjectRepository(new IDBFactory())
  const imported = await projects.migrateLegacyProject(
    other,
    legacyStorage({ 'ui-builder:document:v1': '{oops', 'ui-builder:history-checkpoints': '{oops' }),
  )
  assert.equal(await other.readDocument(imported.id), '{oops')
  assert.deepEqual(await other.listCheckpoints(imported.id), [])
  other.close()
})

test('a failed import writes nothing and is tried again', async () => {
  // A function cannot be stored, so writing the preferences fails after the project itself was already queued.
  await assert.rejects(repository.importOnce(() => ({ name: 'Old', document: '{}', preferences: { theme: () => {} } })))
  assert.deepEqual(await names(), [])
  assert.ok(await projects.migrateLegacyProject(repository, legacyStorage(legacyValues)))
})

test('old keys are removed only after a copy of them is stored, and the theme key stays', async () => {
  const storage = legacyStorage(legacyValues)
  await projects.migrateLegacyProject(repository, storage)

  assert.deepEqual(Object.keys(storage.items), ['ui-builder-theme-settings'])
  const [backup] = await repository.listBackups()
  assert.equal(backup['ui-builder:document:v1'], legacyValues['ui-builder:document:v1'])
  assert.equal(backup['ui-builder:history-checkpoints'], legacyValues['ui-builder:history-checkpoints'])
  await projects.migrateLegacyProject(repository, storage)
  assert.equal((await repository.listBackups()).length, 1)
})
