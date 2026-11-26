import type { ThemeColorMap } from './baseTheme'
import type { ThemeVariant } from './enums'
import { resolveThemeColors } from './themeColors'
import { DEFAULT_THEME_SETTINGS, sanitizeThemeSettings, type ThemeSettings } from './themeSettings'

/** What a person can change about the editor itself. It is theirs, not a part of any project. */
export type EditorAppearance = Pick<ThemeSettings, 'mode' | 'colorPreset' | 'surfacePreset'>

const pickAppearance = ({ mode, colorPreset, surfacePreset }: ThemeSettings): EditorAppearance => ({
  mode,
  colorPreset,
  surfacePreset,
})

export const DEFAULT_EDITOR_APPEARANCE = pickAppearance(DEFAULT_THEME_SETTINGS)

export const sanitizeEditorAppearance = (raw: unknown) => pickAppearance(sanitizeThemeSettings(raw))

export const resolveEditorColors = (appearance: EditorAppearance, variant: ThemeVariant): ThemeColorMap =>
  resolveThemeColors({ ...DEFAULT_THEME_SETTINGS, ...appearance }, variant)
