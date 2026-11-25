import type { McpTheme } from '../../modules/ui-builder/features/mcp-bridge'
import {
  applyThemePatch,
  DESIGN_PRESET_NAMES,
  THEME_CHOICES,
  useThemeSettings,
} from '../../modules/theme/entities/theme-settings'

/** Gives the MCP bridge the theme of the open project; a change is saved with the project like one made in the dialog. */
export function createMcpTheme(): McpTheme {
  const { settings } = useThemeSettings()
  return {
    describe: () => ({ settings: { ...settings.value }, choices: THEME_CHOICES, designPresets: DESIGN_PRESET_NAMES }),
    change: patch => {
      settings.value = applyThemePatch(settings.value, patch)
      return { settings: { ...settings.value } }
    },
  }
}
