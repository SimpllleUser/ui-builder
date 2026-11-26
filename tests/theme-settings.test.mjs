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
    ...(await server.ssrLoadModule(`${THEME}themeCss.ts`)),
    ...(await server.ssrLoadModule(`${THEME}designPresets.ts`)),
    ...(await server.ssrLoadModule(`${THEME}editorAppearance.ts`)),
    ...(await server.ssrLoadModule(`${THEME}pageScope.ts`)),
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

test('type, spacing and field rules stay inside the page scope', () => {
  assert.equal(theme.buildPageCss(settings({}), '.page'), '')
  const css = theme.buildPageCss(
    settings({
      typography: theme.TypographyStyle.Editorial,
      spacing: theme.SpacingScale.Airy,
      fieldStyle: theme.FieldStyle.Filled,
    }),
    '.page',
  )
  assert.match(css, /Source Serif 4/)
  assert.match(css, /\.page \.v-card-text \{ padding: 14px 28px/)
  assert.match(css, /\.page \.v-field--focused/)
  for (const line of css.split('\n').filter(Boolean)) assert.ok(line.startsWith('.page'), line)
})

test('a design preset sets the whole look and keeps the mode', () => {
  const dark = settings({ mode: theme.ThemeMode.Dark })
  assert.equal(theme.matchingDesignPreset(dark), theme.DesignPreset.Material)
  for (const preset of Object.values(theme.DesignPreset)) {
    const applied = theme.applyDesignPreset(dark, preset)
    assert.equal(applied.mode, theme.ThemeMode.Dark)
    assert.equal(theme.matchingDesignPreset(applied), preset)
    assert.deepEqual(theme.sanitizeThemeSettings(applied), applied, `${preset} uses only valid values`)
  }
  const changed = { ...theme.applyDesignPreset(dark, theme.DesignPreset.Soft), radius: 0 }
  assert.equal(theme.matchingDesignPreset(changed), null)
})

test('the exported styles import the fonts before any rule', () => {
  const css = theme.generateThemeCss(theme.applyDesignPreset(settings({}), theme.DesignPreset.Editorial))
  assert.ok(css.startsWith("@import '@fontsource-variable/source-serif-4';"))
  assert.match(css, /@fontsource-variable\/inter/)
  assert.match(css, /:is\(\.v-application, \.v-overlay-container\) \.text-h4/)
})

test('the ink preset stays visible in both modes', () => {
  const ink = settings({ colorPreset: theme.ColorPreset.Ink })
  assert.equal(theme.resolveThemeColors(ink, theme.ThemeVariant.Light).primary, '#18181B')
  assert.equal(theme.resolveThemeColors(ink, theme.ThemeVariant.Dark).primary, '#FAFAFA')
})

test('a chosen font applies with or without a typography style, and is exported', () => {
  const only = settings({ headingFont: theme.FontFamily.Unbounded })
  assert.match(theme.buildPageCss(only, '.page'), /\.page \.text-h1.*Unbounded/)
  assert.doesNotMatch(theme.buildPageCss(only, '.page'), /font-size/)
  assert.match(theme.generateThemeCss(only), /@import '@fontsource-variable\/unbounded';/)
  const overridden = theme.generateThemeCss(
    settings({ typography: theme.TypographyStyle.Editorial, headingFont: theme.FontFamily.Rubik }),
  )
  assert.match(overridden, /Rubik/)
  assert.doesNotMatch(overridden, /source-serif/)
})

test('a theme change from outside is applied whole or refused with what is allowed', async () => {
  const { applyThemePatch } = await server.ssrLoadModule(`${THEME}themePatch.ts`)
  const changed = applyThemePatch(settings({}), { radius: 12, spacing: 'airy', customPrimary: '#7c3aed' })
  assert.deepEqual(
    [changed.radius, changed.spacing, changed.customPrimary, changed.colorPreset],
    [12, 'airy', '#7c3aed', 'custom'],
  )
  const preset = applyThemePatch(settings({ mode: 'dark' }), { preset: 'minimal', radius: 4 })
  assert.deepEqual([preset.mode, preset.colorPreset, preset.radius], ['dark', 'ink', 4])

  assert.throws(() => applyThemePatch(settings({}), { radius: 5 }), /Invalid radius: 5\. Use null, 0, 4/)
  assert.throws(() => applyThemePatch(settings({}), { spacing: 'wide' }), /Invalid spacing.*"airy"/)
  assert.throws(() => applyThemePatch(settings({}), { customPrimary: 'red' }), /hex colour/)
  assert.throws(() => applyThemePatch(settings({}), { shadows: 'none' }), /Unknown theme setting/)
  assert.throws(() => applyThemePatch(settings({}), { preset: 'neon' }), /Unknown design preset/)
})

test("the project's tokens, corners and shadows stay inside the page", () => {
  const scope = theme.PAGE_THEME_SCOPE
  assert.equal(theme.buildScopedThemeCss(settings({}), scope), '')
  const css = theme.buildScopedThemeCss(settings({ radius: 8, shadowProfile: theme.ShadowProfile.Soft }), scope)
  assert.doesNotMatch(css, /:root/)
  assert.ok(css.startsWith(`${scope} {`))
  assert.match(css, /\.v-card[\s\S]*border-radius: 8px/)
})

test('the editor keeps only its own appearance and falls back on bad values', () => {
  const appearance = theme.sanitizeEditorAppearance({ mode: 'dark', colorPreset: 'nonsense', radius: 8 })
  assert.deepEqual(appearance, { ...theme.DEFAULT_EDITOR_APPEARANCE, mode: 'dark' })
  for (const variant of Object.values(theme.ThemeVariant)) {
    assert.deepEqual(
      theme.resolveEditorColors(theme.DEFAULT_EDITOR_APPEARANCE, variant),
      theme.BASE_THEME_COLORS[variant],
    )
  }
})
