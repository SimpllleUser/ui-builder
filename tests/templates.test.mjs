import { test } from 'node:test'
import assert from 'node:assert/strict'
import { server, parseProject, parseDocument, store } from './support.mjs'

test('all starter templates survive validated export and import', () => {
  for (const kind of ['card', 'form', 'columns']) store.addTemplate(kind)
  assert.equal(parseDocument(store.exportDocument()).children.length, 3)
})

test('starter templates: dashboard, table page and sign-in form come ready with their variables and behavior', async () => {
  const { TEMPLATES } = await server.ssrLoadModule('/src/modules/ui-builder/entities/ui-node/model/templateFactory.ts')
  assert.deepEqual(
    TEMPLATES.map(template => template.kind),
    [
      'card',
      'form',
      'columns',
      'dashboard',
      'table',
      'login',
      'testimonials',
      'faq',
      'onboarding',
      'blog',
      'contact',
      'footer',
      'landing',
      'settings',
      'wizard',
      'pricing',
    ],
  )
  const types = node => [node.type, ...[...node.children, ...Object.values(node.slots).flat()].flatMap(types)]

  store.addTemplate('dashboard')
  let dashboard = store.rootNode.children.at(-1)
  assert.equal(dashboard.name, 'Dashboard')
  assert.ok(types(dashboard).filter(type => type === 'VCol').length === 3 && types(dashboard).includes('VDataTable'))
  assert.deepEqual(store.project.state, {}, 'the dashboard needs no variables')
  assert.equal(store.historyVersions.at(-1).label, 'Added Dashboard')

  const before = store.historyVersions.length
  store.addTemplate('table')
  assert.equal(store.historyVersions.length, before + 1, 'template and variables are one undo step')
  assert.equal(store.historyVersions.at(-1).label, 'Added Orders page')
  assert.deepEqual(store.project.state, { query: '', selected: 'none' })
  const page = store.rootNode.children.at(-1)
  const table = page.children.find(node => node.type === 'VDataTable')
  assert.equal(table.props.search, '{{query}}')
  assert.deepEqual(table.events.click, { type: 'set', key: 'selected', value: '{{item}}' })
  const search = page.children[1].children.find(node => node.type === 'VTextField')
  assert.equal(search.model, 'query')
  assert.equal(page.children.at(-1).vIf, 'selected != none')
  store.undo()
  assert.deepEqual(store.project.state, {}, 'undo removes the variables with the template')
  store.redo()
  assert.deepEqual(store.project.state, { query: '', selected: 'none' })

  store.setStateVariable('query', 'kept')
  store.addTemplate('table')
  assert.equal(store.project.state.query, 'kept', 'an existing variable keeps its value')

  store.addTemplate('login')
  assert.deepEqual(Object.keys(store.project.state).sort(), [
    'email',
    'password',
    'query',
    'remember',
    'selected',
    'signedIn',
  ])
  const login = store.rootNode.children.at(-1)
  const button = login.children.find(node => node.type === 'VBtn')
  assert.deepEqual(button.events.click, { type: 'set', key: 'signedIn', value: 'true' })
  assert.equal(login.children.find(node => node.type === 'VAlert').vIf, 'signedIn')
  assert.deepEqual(
    login.children.filter(node => node.model).map(node => node.model),
    ['email', 'password', 'remember'],
  )

  // Everything made from templates survives export and import.
  const project = parseProject(store.exportDocument())
  assert.equal(project.pages[0].root.children.length, store.rootNode.children.length)
  // The command palette and MCP offer them too.
  const { buildCommands } = await server.ssrLoadModule(
    '/src/modules/ui-builder/widgets/command-palette/model/commands.ts',
  )
  const host = {
    addPage() {},
    renameCurrentPage() {},
    importProject() {},
    exportProject() {},

    startTour() {},
    openBehaviorGuide() {},
    openCodeExport() {},
    addTemplate: kind => store.addTemplate(kind),
    openStructureGraph() {},
    toggleFocus() {},
    togglePanel() {},
    modifierKey: 'Ctrl',
  }
  const commands = buildCommands(store, host).filter(command => command.group === 'Templates')
  assert.equal(commands.length, 16)
  const count = store.rootNode.children.length
  commands.find(command => command.id === 'template:dashboard').run()
  assert.equal(store.rootNode.children.length, count + 1)
  const { executeMcpCommand } = await server.ssrLoadModule(
    '/src/modules/ui-builder/features/mcp-bridge/model/mcpCommands.ts',
  )
  executeMcpCommand(store, 'add_template', { kind: 'login' })
  assert.equal(store.rootNode.children.length, count + 2)
})

test('content templates fill their defaults and take every text and list from props', async () => {
  const { TEMPLATES } = await server.ssrLoadModule('/src/modules/ui-builder/entities/ui-node/model/templateFactory.ts')
  assert.deepEqual(TEMPLATES.map(template => template.kind).slice(6), [
    'testimonials',
    'faq',
    'onboarding',
    'blog',
    'contact',
    'footer',
    'landing',
    'settings',
    'wizard',
    'pricing',
  ])
  const all = node => [node, ...[...node.children, ...Object.values(node.slots).flat()].flatMap(all)]
  const added = kind => {
    store.addTemplate(kind)
    return store.rootNode.children.at(-1)
  }

  assert.equal(all(added('testimonials')).filter(node => node.type === 'VCol').length, 3)
  assert.equal(all(added('faq')).filter(node => node.type === 'VExpansionPanel').length, 3)
  assert.equal(all(added('blog')).filter(node => node.type === 'VChip').length, 3)
  assert.equal(all(added('footer')).filter(node => node.type === 'VBtn').length, 9)
  assert.deepEqual(store.project.state, {}, 'content sections need no variables')

  const onboarding = added('onboarding')
  assert.deepEqual(store.project.state, { step: 1, onboarded: false })
  assert.deepEqual(
    onboarding.children.filter(node => node.vIf?.startsWith('step')).map(node => node.vIf),
    ['step == 1', 'step == 2', 'step == 3'],
  )
  const next = all(onboarding.children[0]).find(node => node.name === 'Next')
  assert.deepEqual(next.events.click, { type: 'set', key: 'step', value: '2' })

  const contact = added('contact')
  assert.deepEqual(Object.keys(store.project.state).sort(), [
    'contactEmail',
    'contactMessage',
    'contactName',
    'contactSent',
    'onboarded',
    'step',
  ])
  assert.equal(all(contact).find(node => node.name === 'Send message' && node.events).events.click.key, 'contactSent')
})

test('template props replace defaults, and wrong values fall back instead of breaking the template', () => {
  const all = node => [node, ...[...node.children, ...Object.values(node.slots).flat()].flatMap(all)]
  store.addTemplate('faq', {
    title: 'Help',
    variant: 'popout',
    questions: [{ question: 'Why?', answer: 'Because.' }, { question: 'Only a question' }, 'not an entry'],
  })
  const faq = store.rootNode.children.at(-1)
  assert.equal(all(faq).find(node => node.type === 'VCardTitle').children[0].name, 'Help')
  assert.equal(all(faq).find(node => node.type === 'VExpansionPanels').props.variant, 'popout')
  const panels = all(faq).filter(node => node.type === 'VExpansionPanel')
  assert.deepEqual(
    panels.map(node => [node.props.title, node.props.text]),
    [
      ['Why?', 'Because.'],
      ['Only a question', ''],
    ],
  )

  store.addTemplate('footer', { brand: 'Acme', columns: [{ title: 'Legal', links: ['Terms', 7, 'Privacy'] }] })
  const footer = store.rootNode.children.at(-1)
  assert.deepEqual(
    all(footer)
      .filter(node => node.type === 'VBtn')
      .map(node => node.name),
    ['Terms', 'Privacy'],
  )

  store.addTemplate('contact', { phone: '', address: '' })
  const contact = store.rootNode.children.at(-1)
  assert.deepEqual(
    all(contact)
      .filter(node => node.type === 'VListItem')
      .map(node => node.name),
    ['email'],
    'an empty detail is left out',
  )

  store.addTemplate('testimonials', { quotes: 'broken' })
  assert.equal(all(store.rootNode.children.at(-1)).filter(node => node.type === 'VCol').length, 3)
})

test('template settings: defaults are copies, and the props the dialog sends build the same template as the defaults', async () => {
  const { defaultTemplateProps, templateHasSettings, emptyListEntry, TEMPLATE_SETTINGS } = await server.ssrLoadModule(
    '/src/modules/ui-builder/entities/ui-node/index.ts',
  )
  assert.equal(templateHasSettings('dashboard'), false, 'a template without settings is added at once')
  assert.equal(templateHasSettings('faq'), true)

  const first = defaultTemplateProps('faq')
  first.questions[0].question = 'Changed'
  assert.notEqual(defaultTemplateProps('faq').questions[0].question, 'Changed', 'editing the form keeps the defaults')

  const questions = TEMPLATE_SETTINGS.faq.find(setting => setting.key === 'questions')
  assert.deepEqual(emptyListEntry(questions), { question: '', answer: '' })

  const names = node =>
    [...node.children, ...Object.values(node.slots).flat()].flatMap(child => [child.name, ...names(child)])
  const configurable = ['testimonials', 'faq', 'onboarding', 'blog', 'contact', 'footer']
  for (const kind of [...configurable, 'landing', 'settings', 'wizard', 'pricing']) {
    store.addTemplate(kind)
    const withDefaults = store.rootNode.children.at(-1)
    store.addTemplate(kind, defaultTemplateProps(kind))
    assert.deepEqual(names(store.rootNode.children.at(-1)), names(withDefaults), kind)
  }
})

test('presets: the first one is the default look, others change the shape, and a caller can pick one by id', async () => {
  const { presetTemplateProps, templatePresets, defaultTemplateProps } = await server.ssrLoadModule(
    '/src/modules/ui-builder/entities/ui-node/index.ts',
  )
  const all = node => [node, ...[...node.children, ...Object.values(node.slots).flat()].flatMap(all)]
  const count = (kind, type, props) => {
    store.addTemplate(kind, props)
    return all(store.rootNode.children.at(-1)).filter(node => node.type === type).length
  }

  assert.deepEqual(presetTemplateProps('faq', 'accordion'), defaultTemplateProps('faq'))
  assert.deepEqual(
    templatePresets('onboarding').map(preset => preset.id),
    ['three-steps', 'five-steps'],
  )
  assert.equal(count('testimonials', 'VCol', presetTemplateProps('testimonials', 'single-quote')), 1)
  assert.equal(count('blog', 'VChip', presetTemplateProps('blog', 'two-cards')), 2)
  assert.equal(count('footer', 'VBtn', presetTemplateProps('footer', 'minimal')), 0)
  assert.equal(count('onboarding', 'VCard', { preset: 'five-steps' }), 5, 'an MCP caller picks a preset by id')
  assert.equal(count('testimonials', 'VCol', { preset: 'two-columns', quotes: [] }), 0, 'own props win over the preset')
})

test('the wizard moves to the next step only when the fields of the current one are right', () => {
  store.addTemplate('wizard')
  const wizard = store.rootNode.children.at(-1)
  const [first, second] = wizard.children.filter(node => node.type === 'VForm')
  const [name, email] = first.children.filter(node => node.type === 'VTextField')

  store.startPreview()
  assert.equal(store.previewSubmit(first.id).length > 0, true)
  assert.equal(store.runtimeState.wizardStep, 1)
  store.previewInput(name.id, 'Anna')
  store.previewInput(email.id, 'anna@example.com')
  assert.deepEqual(store.previewSubmit(first.id), [])
  assert.equal(store.runtimeState.wizardStep, 2)
  assert.ok(store.previewSubmit(second.id).length, 'a plan has to be chosen')
})

test('the new page templates are valid documents with the settings applied', () => {
  store.addTemplate('landing', { preset: 'one-button', title: 'Hello' })
  store.addTemplate('settings')
  store.addTemplate('pricing', { preset: 'two-plans' })
  const [landing, settings, pricing] = parseProject(store.exportDocument()).pages[0].root.children
  const all = node => [node, ...node.children.flatMap(all)]
  assert.ok(all(landing).some(node => node.name === 'Hello'))
  assert.ok(!all(landing).some(node => node.name.startsWith('Secondary action')))
  assert.ok(all(settings).find(node => node.type === 'VForm').events.submit)
  assert.equal(all(pricing).filter(node => node.type === 'VCol').length, 2)
  assert.equal('settingsEmail' in store.project.state, true)
})
