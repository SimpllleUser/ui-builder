import { test } from 'node:test'
import assert from 'node:assert/strict'
import { server, runtime, store } from './support.mjs'

test('command palette: finds commands, components, pages, elements and settings, and runs them', async () => {
  const { buildCommands } = await server.ssrLoadModule(
    '/src/modules/ui-builder/widgets/command-palette/model/commands.ts',
  )
  const { searchCommands } = await server.ssrLoadModule(
    '/src/modules/ui-builder/widgets/command-palette/model/commandSearch.ts',
  )
  const calls = []
  const host = {
    addPage: () => calls.push('addPage'),
    renameCurrentPage: () => calls.push('rename'),
    importProject: () => calls.push('import'),
    exportProject: () => calls.push('export'),
    startTour: () => calls.push('tour'),
    openBehaviorGuide: () => calls.push('guide'),
    toggleFocus: () => calls.push('focus'),
    togglePanel: side => calls.push(`panel:${side}`),
    modifierKey: 'Ctrl',
  }
  const find = (commands, query) => searchCommands(commands, query)

  // Nothing selected: components, pages and editor commands are there; element settings are not.
  let commands = buildCommands(store, host)
  assert.equal(find(commands, 'table')[0].title, 'Add Data table', 'the best match comes first')
  assert.ok(find(commands, 'preview').some(command => command.id === 'editor:preview'))
  assert.equal(find(commands, 'striped').length, 0, 'settings need a selected element')
  assert.equal(find(commands, 'zzzz nothing').length, 0)
  assert.ok(commands.every(command => command.run && command.icon && command.group))

  // Add a table through the palette, then its settings appear.
  find(commands, 'add data table')[0].run()
  const table = store.findNodeById(store.selectedNodeId)
  assert.equal(table.type, 'VDataTable')
  commands = buildCommands(store, host)
  const striped = find(commands, 'striped')[0]
  assert.match(striped.title, /Striped rows: turn on/)
  striped.run()
  assert.equal(table.props.striped, true)
  assert.match(find(buildCommands(store, host), 'striped')[0].title, /turn off/, 'the label follows the current value')
  const header = find(buildCommands(store, host), 'header color primary')[0]
  header.run()
  assert.equal(table.props.headerColor, 'primary')

  // Pages: go to one, create via the host, and jump to an element by name.
  const second = store.addPage('Orders')
  store.selectPage(store.pages[0].id)
  commands = buildCommands(store, host)
  find(commands, 'go orders')[0].run()
  assert.equal(store.activePage.id, second.id)
  find(commands, 'new page')[0].run()
  find(commands, 'export')[0].run()
  find(commands, 'focus mode')[0].run()
  assert.deepEqual(calls, ['addPage', 'export', 'focus'])
  store.selectPage(store.pages[0].id)
  store.selectNode(null)
  find(buildCommands(store, host), 'select data table')[0].run()
  assert.equal(store.selectedNodeId, table.id)

  // Destructive commands act on the selected element and can be undone.
  find(buildCommands(store, host), 'delete')[0].run()
  assert.equal(store.findNodeById(table.id), null)
  assert.ok(
    buildCommands(store, host).some(command => command.id === 'editor:undo'),
    'undo is offered after a change',
  )
})

test('component library: favorites, recent and popular come first without repeats', async () => {
  const { quickSections, POPULAR_TYPES } = await server.ssrLoadModule(
    '/src/modules/ui-builder/widgets/components-palette/model/quickSections.ts',
  )
  const available = new Set([...POPULAR_TYPES, 'VChip', 'VTabs'])
  // A new user sees only the popular starter set.
  let sections = quickSections([], [], available)
  assert.deepEqual(
    sections.map(section => section.id),
    ['popular'],
  )
  assert.deepEqual(sections[0].types, POPULAR_TYPES)
  // Favorites lead, recent follows, and nothing is listed twice.
  sections = quickSections(['VChip', 'VBtn'], ['VBtn', 'VTabs', 'VCard'], available)
  assert.deepEqual(
    sections.map(section => section.id),
    ['favorites', 'recent', 'popular'],
  )
  assert.deepEqual(sections[0].types, ['VChip', 'VBtn'])
  assert.deepEqual(sections[1].types, ['VTabs', 'VCard'])
  const all = sections.flatMap(section => section.types)
  assert.equal(new Set(all).size, all.length)
  assert.ok(!sections[2].types.includes('VBtn') && !sections[2].types.includes('VCard'))
  // Components that no longer exist are skipped.
  assert.deepEqual(
    quickSections(['Gone'], ['AlsoGone'], available).map(section => section.id),
    ['popular'],
  )

  // Adding a component records it: newest first, no duplicates, capped.
  store.addComponent('VChip', 'root-canvas')
  store.addComponent('VBtn', 'root-canvas')
  store.addComponent('VChip', 'root-canvas')
  assert.deepEqual(store.recentComponentTypes, ['VChip', 'VBtn'])
  for (const type of ['VCard', 'VRow', 'VCol', 'VList', 'VTabs']) store.addComponent(type, 'root-canvas')
  assert.equal(store.recentComponentTypes.length, 6)
  assert.equal(store.recentComponentTypes[0], 'VTabs')
  assert.equal(store.addComponent('VBtn', 'missing-parent'), false)
  assert.equal(store.recentComponentTypes[0], 'VTabs', 'a failed add is not recorded')
})

test('the quick tour moves on as the person works, and only starts on an untouched project', async () => {
  const { TOUR_STEPS, stepAfterProgress, isUntouched } = await server.ssrLoadModule(
    '/src/modules/ui-builder/widgets/onboarding/model/tourSteps.ts',
  )
  assert.equal(TOUR_STEPS.length, 3)
  const idle = { hasContent: false, hasSelection: false, previewing: false }
  assert.equal(stepAfterProgress(0, idle), 0, 'nothing done: stay on the first hint')
  assert.equal(stepAfterProgress(0, { ...idle, hasContent: true }), 1)
  assert.equal(stepAfterProgress(0, { ...idle, hasContent: true, hasSelection: true }), 2)
  assert.equal(stepAfterProgress(1, { ...idle, hasSelection: true }), 2)
  assert.equal(stepAfterProgress(2, { hasContent: true, hasSelection: true, previewing: true }), null, 'all done')
  assert.equal(stepAfterProgress(2, { ...idle, previewing: true }), null, 'previewing finishes the last hint')
  assert.equal(stepAfterProgress(1, { ...idle, previewing: true }), 1, 'skipping ahead does not skip a hint')

  assert.equal(isUntouched(store.project), true, 'a new project is untouched')
  store.addComponent('VBtn', 'root-canvas')
  assert.equal(isUntouched(store.project), false)
  store.undo()
  store.setStateVariable('x', 1)
  assert.equal(isUntouched(store.project), false, 'a variable counts as work')
  store.undo()
  store.addPage('Second')
  assert.equal(isUntouched(store.project), false, 'so does a second page')
})

test('input problems come with a reason that can be shown beside the field', async () => {
  const { columnKeyError } = await server.ssrLoadModule(
    '/src/modules/ui-builder/entities/ui-node/model/tableMutations.ts',
  )
  const { pagePathError, variableNameError } = await server.ssrLoadModule(
    '/src/modules/ui-builder/entities/ui-node/model/projectMutations.ts',
  )
  const { conditionError } = await server.ssrLoadModule('/src/modules/ui-builder/entities/ui-node/model/runtime.ts')

  const columns = [
    { key: 'id', title: 'ID' },
    { key: 'name', title: 'Name' },
  ]
  assert.equal(columnKeyError(columns, 'total'), null)
  assert.equal(columnKeyError(columns, 'name', 'name'), null, "keeping a column's own key is fine")
  assert.match(columnKeyError(columns, 'name', 'id'), /already uses/)
  assert.match(columnKeyError(columns, ''), /Enter a key/)
  assert.match(columnKeyError(columns, 'a b'), /letters, digits/)

  const pages = [
    { id: 'a', path: '/' },
    { id: 'b', path: '/orders' },
  ]
  assert.equal(pagePathError(pages, '/reports'), null)
  assert.equal(pagePathError(pages, '/orders', 'b'), null, 'a page may keep its own route')
  assert.match(pagePathError(pages, '/orders', 'a'), /Another page/)
  assert.match(pagePathError(pages, 'orders'), /Use a route like/)
  assert.match(pagePathError(pages, '/a b'), /Use a route like/)

  assert.equal(variableNameError('isOpen'), null)
  assert.match(variableNameError(''), /Enter a name/)
  assert.match(variableNameError('my var'), /letters, digits and _/)
  assert.match(variableNameError('1st'), /do not start with a digit/)
  assert.match(variableNameError('constructor'), /reserved/)

  assert.equal(conditionError(''), null, 'no condition is fine')
  for (const fine of ['open', '!open', 'status == paid', 'count >= 2', 'selected.step < 3', 'a and not b', '(open)'])
    assert.equal(conditionError(fine), null, fine)
  for (const bad of ['open &&', '== 3', 'a b c', 'alert(1)', 'open | closed', 'x = 1'])
    assert.equal(typeof conditionError(bad), 'string', bad)

  // The same rules guard the commands behind the interface, so nothing wrong slips in by another route.
  assert.equal(store.setStateVariable('my var', 1), false)
  assert.match(store.notice, /Variable name: Use letters/)
  assert.equal(store.addPage('X', '/b/c d'), null)
  assert.match(store.notice, /Route \/b\/c d: Use a route like/)
})

test('inspector tabs: settings are sorted into tabs, empty groups drop out, and a sensible tab opens first', async () => {
  const { fieldTab, sectionsForTab, defaultTab } = await server.ssrLoadModule(
    '/src/modules/ui-builder/widgets/property-panel/model/fieldTabs.ts',
  )
  const { COMPONENT_DEFS } = await server.ssrLoadModule(
    '/src/modules/ui-builder/entities/ui-node/model/componentDefinitions.ts',
  )
  assert.equal(fieldTab({ kind: 'spacing' }, ''), 'layout')
  assert.equal(fieldTab({ kind: 'row', fields: [] }, ''), 'layout')
  assert.equal(fieldTab({ kind: 'text', prop: 'label', label: 'Label' }, 'Field'), 'content')
  assert.equal(fieldTab({ kind: 'text', prop: 'height', label: 'Height' }, 'Size'), 'appearance')
  assert.equal(fieldTab({ kind: 'select', prop: 'color', label: 'Color', options: [] }, 'Grid Column'), 'layout')
  assert.equal(fieldTab({ kind: 'table-editor' }, 'Data'), 'content')
  assert.equal(fieldTab({ kind: 'custom-classes' }, ''), 'advanced')

  // Every setting of every component lands in exactly one tab, so none can go missing from the inspector.
  for (const def of Object.values(COMPONENT_DEFS)) {
    const placed = ['content', 'layout', 'appearance'].flatMap(tab => sectionsForTab(def.propertySections, tab))
    const total = def.propertySections
      .flatMap(section => section.fields)
      .filter(field => field.kind !== 'custom-classes')
    assert.equal(placed.flatMap(section => section.fields).length, total.length, def.type)
  }
  assert.ok(sectionsForTab(COMPONENT_DEFS.VDataTable.propertySections, 'layout').length >= 1, 'spacing is on Layout')
  assert.equal(
    sectionsForTab(COMPONENT_DEFS.VDivider.propertySections, 'content').length,
    0,
    'empty tabs have no groups',
  )

  const button = store.createNode('VBtn')
  assert.equal(defaultTab(button, COMPONENT_DEFS.VBtn.propertySections), 'content', 'a button has text')
  assert.equal(defaultTab(null, COMPONENT_DEFS.VDivider.propertySections), 'layout')
  assert.equal(defaultTab(null, []), 'appearance')
})

test('history times read as “just now”, minutes, hours, and a date once a day has passed', async () => {
  const { timeAgo, shortDateTime } = await server.ssrLoadModule(
    '/src/modules/ui-builder/widgets/sidebar-tree/model/timeAgo.ts',
  )
  const now = Date.UTC(2026, 10, 22, 12, 0, 0)
  const ago = seconds => timeAgo(now - seconds * 1000, now)
  assert.equal(ago(0), 'just now')
  assert.equal(ago(44), 'just now')
  assert.equal(ago(45), '1 min ago')
  assert.equal(ago(5 * 60), '5 min ago')
  assert.equal(ago(3599), '60 min ago')
  assert.equal(ago(3 * 3600), '3 h ago')
  assert.equal(ago(86400), shortDateTime.format(now - 86400 * 1000))
})

test('design controls: style reading and writing, sizes, alignment and spacing names', async () => {
  const design = await server.ssrLoadModule('/src/modules/ui-builder/widgets/property-panel/model/designStyle.ts')
  const inline = await server.ssrLoadModule('/src/shared/lib/inlineStyle.ts')
  const m = { ...design, ...inline }

  // Style may be an object or CSS text (for example from MCP); both read the same.
  assert.deepEqual(m.readStyle({ color: 'red', margin: 4 }), { color: 'red' }, 'non-text values are ignored')
  assert.deepEqual(m.readStyle('background-color: #fff; border-radius: 8px;;  '), {
    backgroundColor: '#fff',
    borderRadius: '8px',
  })
  assert.deepEqual(m.readStyle(undefined), {})
  assert.deepEqual(
    m.withStyle({ a: '1', b: '2' }, { a: null, c: '3', b: '' }),
    { c: '3' },
    'null and empty remove a property',
  )

  // Design values carry !important so they beat Vuetify's utility classes; the controls read them without it.
  assert.equal(m.markImportant('8px'), '8px !important')
  assert.equal(m.markImportant('8px !important'), '8px !important', 'never doubled')
  assert.equal(m.stripImportant('8px !important'), '8px')
  assert.deepEqual(m.cleanStyle({ margin: '4px !important', color: 'red' }), { margin: '4px', color: 'red' })

  assert.equal(m.parsePx('12px'), 12)
  assert.equal(m.parsePx('-4.5'), -4.5)
  assert.equal(m.parsePx('50%'), null)
  assert.equal(m.parsePx(undefined), null)
  assert.equal(m.toPx(8), '8px')
  assert.equal(m.toPx(null), null)

  assert.equal(m.sizeMode('100%'), m.SizeMode.Fill)
  assert.equal(m.sizeMode('fit-content'), m.SizeMode.Hug)
  assert.equal(m.sizeMode('240px'), m.SizeMode.Fixed)
  assert.equal(m.sizeMode('auto'), null)
  assert.equal(m.sizeValue(m.SizeMode.Fill, undefined, 100), '100%')
  assert.equal(m.sizeValue(m.SizeMode.Fixed, '240px', 100), '240px', 'a fixed size keeps the pixels it has')
  assert.equal(m.sizeValue(m.SizeMode.Fixed, '100%', 80), '80px', 'otherwise it starts from the fallback')

  // Every cell of the alignment grid survives a write and a read, in a row and in a column.
  for (const axis of [m.Axis.Row, m.Axis.Column]) {
    for (const horizontal of Object.values(m.Position)) {
      for (const vertical of Object.values(m.Position)) {
        const style = {
          display: 'flex',
          ...(axis === m.Axis.Column ? { flexDirection: 'column' } : {}),
          ...m.alignmentStyle(axis, { horizontal, vertical }),
        }
        assert.deepEqual(m.readAlignment(style), { horizontal, vertical }, `${axis} ${horizontal}/${vertical}`)
      }
    }
  }
  assert.deepEqual(m.alignmentStyle(m.Axis.Row, { horizontal: m.Position.End, vertical: m.Position.Start }), {
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  })
  assert.deepEqual(
    m.alignmentStyle(m.Axis.Column, { horizontal: m.Position.End, vertical: m.Position.Start }),
    { justifyContent: 'flex-start', alignItems: 'flex-end' },
    'in a column the roles swap',
  )
  assert.equal(m.readAlignment({ justifyContent: 'space-between' }), null, 'values the grid cannot show')
  assert.equal(m.isFlex({ display: 'flex' }), true)
  assert.equal(m.isFlex({}), false)

  assert.equal(m.spacingProperty(m.SpacingBox.Margin, m.Side.Top), 'marginTop')
  assert.equal(m.spacingProperty(m.SpacingBox.Padding, m.Side.Left), 'paddingLeft')
  assert.equal(m.cornerProperty(m.Corner.TopLeft), 'borderTopLeftRadius')
})

test('theme colours are kept as theme variables and recognised again', async () => {
  const { THEME_COLORS, ThemeColor, themeColorValue, parseThemeColor } = await server.ssrLoadModule(
    '/src/shared/lib/themeColors.ts',
  )
  assert.ok(
    ['primary', 'secondary', 'success', 'info', 'warning', 'error', 'surface', 'background'].every(name =>
      THEME_COLORS.includes(name),
    ),
  )
  assert.equal(themeColorValue(ThemeColor.Primary), 'rgb(var(--v-theme-primary))')
  assert.equal(themeColorValue(ThemeColor.OnSurface), 'rgb(var(--v-theme-on-surface))')
  for (const color of THEME_COLORS) assert.equal(parseThemeColor(themeColorValue(color)), color, color)
  assert.equal(parseThemeColor(' rgb( var(--v-theme-error) ) '), 'error', 'spacing does not matter')
  assert.equal(parseThemeColor('#ff0000'), null, 'a custom colour is not a theme colour')
  assert.equal(parseThemeColor('rgb(var(--v-theme-nonsense))'), null, 'nor is an unknown name')
  assert.equal(parseThemeColor(undefined), null)
})
