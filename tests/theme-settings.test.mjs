import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const THEME = '/src/modules/theme/entities/theme-settings/model/'
let server, theme, colorLib, literal

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true, watch: null, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
  })
  theme = {
    ...(await server.ssrLoadModule(`${THEME}enums.ts`)),
    ...(await server.ssrLoadModule(`${THEME}themeSettings.ts`)),
    ...(await server.ssrLoadModule(`${THEME}themeColors.ts`)),
    ...(await server.ssrLoadModule(`${THEME}vuetifyDefaults.ts`)),
    ...(await server.ssrLoadModule(`${THEME}exportConfig.ts`)),
    ...(await server.ssrLoadModule(`${THEME}radiusCss.ts`)),
    ...(await server.ssrLoadModule(`${THEME}baseTheme.ts`)),
  }
  colorLib = await server.ssrLoadModule('/src/shared/lib/hexColor.ts')
  literal = await server.ssrLoadModule('/src/shared/lib/objectLiteral.ts')
})
after(() => server.close())

const settings = changes => ({ ...theme.DEFAULT_THEME_SETTINGS, ...changes })

test('untouched settings change nothing', () => {
  for (const variant of Object.values(theme.ThemeVariant)) {
    assert.deepEqual(theme.resolveThemeColors(settings({}), variant), theme.BASE_THEME_COLORS[variant])
  }
  assert.deepEqual(theme.buildVuetifyDefaults(settings({})), {})
  assert.equal(theme.buildRadiusCss(null), '')
})

test('a brand preset sets both colours with readable text on them', () => {
  const colors = theme.resolveThemeColors(settings({ colorPreset: theme.ColorPreset.Amber }), theme.ThemeVariant.Light)
  assert.equal(colors.primary, '#FFB300')
  assert.equal(colors['on-primary'], '#0F172A', 'dark text on a light amber')
  const blue = theme.resolveThemeColors(
    settings({ colorPreset: theme.ColorPreset.DeepPurple }),
    theme.ThemeVariant.Dark,
  )
  assert.equal(blue['on-primary'], '#FFFFFF')
  assert.equal(blue.background, theme.BASE_THEME_COLORS.dark.background, 'other colours stay')
})

test('custom colours are used, and a broken value falls back', () => {
  const custom = settings({
    colorPreset: theme.ColorPreset.Custom,
    customPrimary: '#112233',
    customSecondary: '#ffffff',
  })
  assert.equal(theme.resolveThemeColors(custom, theme.ThemeVariant.Light).primary, '#112233')
  assert.equal(
    theme.sanitizeThemeSettings({ customPrimary: 'red' }).customPrimary,
    theme.DEFAULT_THEME_SETTINGS.customPrimary,
  )
})

test('surface presets differ per variant', () => {
  const zinc = settings({ surfacePreset: theme.SurfacePreset.Zinc })
  assert.equal(theme.resolveThemeColors(zinc, theme.ThemeVariant.Light).background, '#FAFAFA')
  assert.equal(theme.resolveThemeColors(zinc, theme.ThemeVariant.Dark).background, '#09090B')
})

test('sanitizing drops what is not a valid setting', () => {
  const clean = theme.sanitizeThemeSettings({ mode: 'purple', radius: 7, density: 'compact', extra: 1 })
  assert.equal(clean.mode, theme.ThemeMode.System)
  assert.equal(clean.radius, null)
  assert.equal(clean.density, theme.ThemeDensity.Compact)
  assert.equal('extra' in clean, false)
  assert.deepEqual(theme.sanitizeThemeSettings('nonsense'), theme.DEFAULT_THEME_SETTINGS)
})

test('component defaults follow density, card and button style', () => {
  const defaults = theme.buildVuetifyDefaults(
    settings({
      density: theme.ThemeDensity.Compact,
      cardStyle: theme.CardStyle.Outlined,
      interactiveStyle: theme.InteractiveStyle.Modern,
    }),
  )
  assert.deepEqual(defaults.VBtn, { density: 'compact', variant: 'flat', class: 'text-none' })
  assert.deepEqual(defaults.VCard, { variant: 'outlined' })
  assert.deepEqual(defaults.global, { ripple: false })
})

test('the radius rules name the chosen size', () => {
  assert.match(theme.buildRadiusCss(12), /\.v-card[\s\S]*border-radius: 12px/)
})

test('the exported config holds the resolved colours and only the needed defaults', () => {
  const code = theme.generateVuetifyConfig(
    settings({ colorPreset: theme.ColorPreset.Teal, mode: theme.ThemeMode.Dark }),
  )
  assert.match(code, /defaultTheme: 'dark'/)
  assert.match(code, /primary: '#00897B'/)
  assert.match(code, /'on-primary': '#FFFFFF'/)
  assert.doesNotMatch(code, /defaults:/)
  assert.match(
    theme.generateVuetifyConfig(settings({ density: theme.ThemeDensity.Compact })),
    /defaults: \{\n {4}VBtn: \{/,
  )
})

test('text colour is chosen by contrast', () => {
  assert.equal(colorLib.readableTextColor('#000000'), '#FFFFFF')
  assert.equal(colorLib.readableTextColor('#fff'), '#0F172A')
  assert.equal(colorLib.isHexColor('#12345'), false)
})

test('object literals read like hand-written code', () => {
  assert.equal(
    literal.toObjectLiteral({ a: 'x', 'on-b': "it's", n: 1, off: false, empty: {} }),
    "{\n  a: 'x',\n  'on-b': 'it\\'s',\n  n: 1,\n  off: false,\n  empty: {},\n}",
  )
})

test('a shadow profile adds rules for raised cards and buttons only', async () => {
  const { ShadowProfile } = theme
  const { buildThemeCss } = await server.ssrLoadModule(`${THEME}themeCss.ts`)
  assert.equal(buildThemeCss(settings({})), '')
  const soft = buildThemeCss(settings({ shadowProfile: ShadowProfile.Soft, radius: 8 }))
  assert.match(soft, /border-radius: 8px/)
  assert.match(soft, /\.v-card--variant-elevated/)
  assert.match(theme.generateThemeCss(settings({ shadowProfile: ShadowProfile.NeoBrutal })), /4px 4px 0/)
  assert.equal(theme.sanitizeThemeSettings({ shadowProfile: 'glow' }).shadowProfile, ShadowProfile.Default)
})
