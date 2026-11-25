import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compileScript, compileTemplate, parse } from 'vue/compiler-sfc'
import { unzipSync, strFromU8 } from 'fflate'
import { server, store } from './support.mjs'

const MODEL = '/src/modules/ui-builder/widgets/code-export/model/'
const build = async (changes = {}) => {
  const { buildVueProject } = await server.ssrLoadModule(`${MODEL}vueProject.ts`)
  return buildVueProject({
    name: 'My Shop!',
    project: store.project,
    prefabs: store.prefabs,
    vuetifyConfig: 'export default {}\n',
    themeCss: '',
    tableCss: '.ui-table {}\n',
    ...changes,
  })
}

/** Compiles a component as the exported app's build would, resolving template names against its script. */
function compile(path, code) {
  const { descriptor, errors } = parse(code, { filename: path })
  assert.deepEqual(errors, [], path)
  const script = descriptor.scriptSetup ? compileScript(descriptor, { id: path }) : null
  const result = compileTemplate({
    id: path,
    filename: path,
    source: descriptor.template.content,
    compilerOptions: { bindingMetadata: script?.bindings },
  })
  assert.deepEqual(result.errors, [], path)
}

const fillProject = () => {
  store.addTemplate('dashboard')
  store.addPage('Orders')
  store.addTemplate('form')
  store.addPage('Orders')
  store.setStateVariable('open', false)
  store.addComponent('VBtn')
  store.updateNodeLogic(store.selectedNodeId, { events: { click: { type: 'toggle', key: 'open' } } })
  store.savePrefab(store.selectedNodeId, 'Orders', {})
  store.editLayout(true)
  store.editLayout(false)
}

test('the exported project has its structure, and every component compiles', async () => {
  fillProject()
  const { name, files } = await build()
  assert.equal(name, 'my-shop')
  for (const path of [
    'package.json',
    'index.html',
    'vite.config.js',
    'README.md',
    'src/main.js',
    'src/App.vue',
    'src/router/index.js',
    'src/stores/project.js',
    'src/plugins/vuetify.js',
    'src/styles/tables.css',
    'src/layouts/AppLayout.vue',
    'src/pages/Home.vue',
    'src/pages/Orders.vue',
    'src/pages/Orders2.vue',
    'src/components/Orders.vue',
  ])
    assert.ok(files[path], path)
  assert.equal(files['src/styles/theme.css'], undefined)
  for (const [path, code] of Object.entries(files)) if (path.endsWith('.vue')) compile(path, code)
})

test('pages share variables through the store, and routes follow the pages', async () => {
  fillProject()
  const { files } = await build()
  const store_ = files['src/stores/project.js']
  assert.match(store_, /const open = ref\(false\)/)
  assert.match(store_, /return \{ .*open.* \}/)
  assert.match(files['src/pages/Orders2.vue'], /const \{ open \} = storeToRefs\(useProjectStore\(\)\)/)
  assert.doesNotMatch(files['src/pages/Orders2.vue'], /ref\(false\)/)
  const router = files['src/router/index.js']
  assert.match(router, /path: '\/', component: \(\) => import\('\.\.\/pages\/Home\.vue'\)/)
  assert.match(router, /path: '\/orders-2'/)
  assert.match(files['src/App.vue'], /<template>\n  <AppLayout \/>/, 'the default layout brings its own VApp')
})

test('without variables or a layout there is no store, and fonts of the theme become dependencies', async () => {
  const { files } = await build({ themeCss: "@import '@fontsource-variable/inter';" })
  assert.equal(files['src/stores/project.js'], undefined)
  assert.doesNotMatch(files['src/main.js'], /pinia/)
  assert.match(files['src/App.vue'], /<RouterView \/>/)
  const manifest = JSON.parse(files['package.json'])
  assert.ok(manifest.dependencies['@fontsource-variable/inter'])
  assert.equal(manifest.dependencies.pinia, undefined)
})

test('the archive holds every file in one folder', async () => {
  const { zipProject } = await server.ssrLoadModule(`${MODEL}projectArchive.ts`)
  const exported = await build()
  const unpacked = unzipSync(zipProject(exported))
  assert.equal(Object.keys(unpacked).length, Object.keys(exported.files).length)
  assert.equal(strFromU8(unpacked['my-shop/src/main.js']), exported.files['src/main.js'])
})

test('Cyrillic names become readable file and folder names', async () => {
  const { transliterate } = await server.ssrLoadModule('/src/shared/lib/transliterate.ts')
  const cases = {
    Замовлення: 'Zamovlennia',
    'Мої замовлення': 'Moi zamovlennia',
    'Юлія Їжак': 'Yuliia Yizhak',
    Згода: 'Zghoda',
    'Комп’ютер': 'Kompiuter',
    ЩОСЬ: 'ShchOS',
    "Don't stop": "Don't stop",
  }
  for (const [from, to] of Object.entries(cases)) assert.equal(transliterate(from), to, from)

  store.addPage('Замовлення')
  store.addPage('Мої товари')
  const { name, files } = await build({ name: 'Мій магазин' })
  assert.equal(name, 'mii-mahazyn')
  assert.ok(files['src/pages/Zamovlennia.vue'])
  assert.ok(files['src/pages/MoiTovary.vue'])
})
