import { test } from 'node:test'
import assert from 'node:assert/strict'
import { server } from './support.mjs'

const THEME = '/src/modules/theme/entities/theme-settings/model/'
async function load() {
  return {
    ...(await server.ssrLoadModule(`${THEME}themeSettings.ts`)),
    ...(await server.ssrLoadModule(`${THEME}themeColors.ts`)),
    ...(await server.ssrLoadModule(`${THEME}exportConfig.ts`)),
    ...(await server.ssrLoadModule(`${THEME}themePatch.ts`)),
    ...(await server.ssrLoadModule(`${THEME}extraColors.ts`)),
  }
}

test('colours of the project are theme colours, in both modes and in the export', async () => {
  const theme = await load()
  const settings = { ...theme.DEFAULT_THEME_SETTINGS, extraColors: { cobalt: '#1B3FD1' } }
  for (const variant of ['light', 'dark']) {
    const colors = theme.resolveThemeColors(settings, variant)
    assert.deepEqual([colors.cobalt, colors['on-cobalt']], ['#1B3FD1', '#FFFFFF'])
  }
  assert.match(theme.generateVuetifyConfig(settings), /cobalt: '#1B3FD1'/)
})

test('only usable names and colours are kept, and a change from outside says what is wrong', async () => {
  const theme = await load()
  const raw = { cobalt: '#123', primary: '#000000', 'on-x': '#000000', Bad: '#000000', ink: 'navy' }
  assert.deepEqual(theme.sanitizeThemeSettings({ extraColors: raw }).extraColors, { cobalt: '#123' })

  const added = theme.applyThemePatch(theme.DEFAULT_THEME_SETTINGS, { extraColors: { cobalt: '#1B3FD1', ink: '#000' } })
  assert.deepEqual(added.extraColors, { cobalt: '#1B3FD1', ink: '#000' })
  const removed = theme.applyThemePatch(added, { extraColors: { ink: null }, radius: 8 })
  assert.deepEqual([removed.extraColors, removed.radius], [{ cobalt: '#1B3FD1' }, 8])
  assert.deepEqual(theme.applyThemePatch(added, { preset: 'minimal' }).extraColors, added.extraColors)

  const change = extraColors => () => theme.applyThemePatch(theme.DEFAULT_THEME_SETTINGS, { extraColors })
  assert.throws(change({ primary: '#000' }), /already a colour/)
  assert.throws(change({ 'My colour': '#000' }), /small Latin letters/)
  assert.throws(change({ ink: 'navy' }), /hex colour/)
  assert.throws(change(Object.fromEntries([...'abcdefghi'].map(name => [name, '#000']))), /at most 8/)
})

test('own colours are named in styles, and stroke sides and shadows read back', async () => {
  const colors = await server.ssrLoadModule('/src/shared/lib/themeColors.ts')
  assert.equal(colors.themeColorFromName('theme-cobalt'), 'rgb(var(--v-theme-cobalt))')
  assert.equal(colors.themeColorFromName('cobalt'), null)
  assert.equal(colors.parseThemeColor('rgb(var(--v-theme-cobalt))', ['cobalt']), 'cobalt')
  assert.equal(colors.parseThemeColor('rgb(var(--v-theme-cobalt))'), null)

  const design = await server.ssrLoadModule('/src/modules/ui-builder/widgets/property-panel/model/designStyle.ts')
  assert.deepEqual(design.sideStrokePatch({ borderWidth: '1px' }, 'Left', 3), {
    borderTopWidth: '1px',
    borderRightWidth: '1px',
    borderBottomWidth: '1px',
    borderLeftWidth: '3px',
    borderWidth: null,
    borderStyle: 'solid',
  })
  assert.equal(design.strokePatch({}, 'red').borderWidth, '1px')
  assert.equal('borderWidth' in design.strokePatch({ borderLeftWidth: '3px' }, 'red'), false)
  assert.equal(design.strokePatch({}, null).borderTopWidth, null)
  assert.equal(design.parseShadow(design.shadowValue('md')), 'md')
  assert.equal(design.parseShadow('1px 1px red'), null)
})
