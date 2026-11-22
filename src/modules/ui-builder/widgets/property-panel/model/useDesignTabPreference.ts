import { useStorage } from '@vueuse/core'

/** The Design tab (Figma-style controls) is an extra; this remembers whether the person wants it. */
export const useDesignTabPreference = () => useStorage('ui-builder:design-tab', true)
