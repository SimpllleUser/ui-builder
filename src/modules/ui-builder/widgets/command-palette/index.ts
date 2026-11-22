// Public API of this slice: everything outside it imports from here, never from the files inside.
export type { CommandHost } from './model/commands'
export { default as CommandPalette } from './ui/CommandPalette.vue'
