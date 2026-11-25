import { test } from 'node:test'
import assert from 'node:assert/strict'
import { server, store } from './support.mjs'

const THEME = '/src/modules/theme/entities/theme-settings/model/'
const loadTokens = () => server.ssrLoadModule('/src/shared/lib/themeTokens.ts')
async function loadTheme() {
  return {
    ...(await server.ssrLoadModule(`${THEME}enums.ts`)),
    ...(await server.ssrLoadModule(`${THEME}themeSettings.ts`)),
    ...(await server.ssrLoadModule(`${THEME}tokenCss.ts`)),
    ...(await server.ssrLoadModule(`${THEME}exportConfig.ts`)),
  }
}

test('a token value refers to the theme variable, with the default beside it, and reads back', async () => {
  const tokens = await loadTokens()
  assert.equal(tokens.spaceValue('md'), 'var(--ub-space-md, 16px)')
  assert.equal(tokens.parseSpaceToken(tokens.spaceValue('2xl')), '2xl')
  assert.equal(tokens.parseRadiusToken(tokens.radiusValue('lg')), 'lg')
  assert.equal(tokens.parseTextToken(tokens.textStylePatch('h4').fontSize), 'h4')
  assert.equal(tokens.parseSpaceToken('16px'), null)
  assert.equal(tokens.tokenFromName('radius-sm'), 'var(--ub-radius-sm, 2px)')
  assert.equal(tokens.tokenFromName('md'), null)
})

test('the theme defines only the variables it changes', async () => {
  const theme = await loadTheme()
  const settings = changes => ({ ...theme.DEFAULT_THEME_SETTINGS, ...changes })
  assert.equal(theme.buildTokenCss(settings({})), '')
  const css = theme.buildTokenCss(
    settings({ radius: 8, spacing: theme.SpacingScale.Airy, typography: theme.TypographyStyle.Editorial }),
  )
  assert.match(css, /--ub-space-md: 28px;/)
  assert.match(css, /--ub-radius-lg: 16px;/)
  assert.match(css, /--ub-text-h1-size: clamp\(3rem, 8vw, 5rem\);/)
  assert.match(css, /--ub-text-h1-font: [^;]*Source Serif/)
  assert.match(theme.generateThemeCss(settings({ radius: 4 })), /--ub-radius-md: 4px;/, 'exported with the theme')
})

test('agents set tokens by name, and the document keeps the references', async () => {
  const { executeMcpCommand } = await server.ssrLoadModule(
    '/src/modules/ui-builder/features/mcp-bridge/model/mcpCommands.ts',
  )
  store.addComponent('VCard', 'root-canvas')
  const id = store.selectedNodeId
  const { style } = executeMcpCommand(store, 'set_style', {
    id,
    style: { padding: 'space-lg', borderRadius: 'radius-md', textStyle: 'h5' },
  })
  assert.equal(style.padding, 'var(--ub-space-lg, 24px)')
  assert.equal(style.borderRadius, 'var(--ub-radius-md, 4px)')
  assert.match(style.fontSize, /^var\(--ub-text-h5-size,/)
  assert.throws(() => executeMcpCommand(store, 'set_style', { id, style: { textStyle: 'huge' } }), /Unknown text style/)
  executeMcpCommand(store, 'set_style', { id, style: { textStyle: null } })
  assert.equal(store.findNodeById(id).props.style.fontSize, undefined)
})
