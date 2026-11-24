/**
 * Style added to the Preview frame after the editor's own styles are copied into it.
 *
 * The editor locks its own window (`html` and `.v-application__wrap` do not scroll, so only the panels do).
 * Those rules are copied into the frame too and would cut a long page off inside a shared layout (`VApp`),
 * so the frame puts the normal page behaviour back: the page grows with its content and the frame scrolls.
 */
export const PREVIEW_FRAME_STYLE = `
html, body { margin: 0; height: auto !important; overflow: auto !important; }
.v-application__wrap { height: auto !important; min-height: 100vh !important; overflow: visible !important; }
.preview-app { min-height: 100vh; background: rgb(var(--v-theme-background)); color: rgb(var(--v-theme-on-background)); }
`
