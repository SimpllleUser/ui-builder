import type { InjectionKey } from 'vue'

/** Opens the help about conditions. The editor shell provides it, so a panel can offer help without knowing where it lives. */
export const OPEN_CONDITIONS_HELP: InjectionKey<() => void> = Symbol('open-conditions-help')
