# UI Builder

A Vue 3 and Vuetify visual editor for composing pages from components.

```sh
npm install
npm run dev
```

Open http://localhost:3001.

## Editing

- Click a component in the library or drag it onto a container. The library shows where clicking will insert it. Search filters the library.
- Start an empty page with a card, contact form or responsive two-column template.
- Select elements on the canvas or in Layers. Shift/Ctrl/Cmd-click selects several; the inspector then edits shared spacing.
- Use the inspector's Content, Layout, Style and Advanced tabs. Text inside a button or heading can be edited directly from its parent's Content tab.
- Rename a layer with F2, double-click, or its actions menu. Use arrow keys to navigate Layers, and Enter/Space to select.
- Drag layers to reorder or move between containers. The actions menu also offers Move up/down; the inspector's **Move to…** dialog can move an element to another container or named slot without dragging.
- Empty named slots are hidden behind **Add slot content…**. Unwrap is disabled while named slots contain content, so they cannot be accidentally discarded.
- Undo/Redo supports Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z. Text inputs keep native text undo. Property edits are grouped while typing; immediate Undo includes the latest edit.
- Save selected elements in **My components** for reuse.

## Saving and preview

Pages save automatically in this browser and restore on reload. The status beside the page name reports saving failures. Use **Export** for a JSON backup or transfer, and **Import** to restore one. Import validates the document before replacing the page, and can be undone. This is local browser storage, not cloud sync; clearing site data removes saved pages and components.

**Preview** hides the editor panels and uses an isolated viewport for Desktop (1280), Tablet (768) and Mobile (390). Zoom changes the display scale independently of the viewport width. Use **Back to editor** or Escape to return.

Panel buttons hide/show the library and inspector. Drag their dividers to resize them, or focus a divider and use the arrow keys. On narrower screens, panels open as overlays.

The previous **Classic** editor is available from the top-right menu. It has a separate document and does not save automatically.

## Checks

```sh
npm test
npm run build
```

The tests cover history, document recovery/import, safe unwrapping, component insertion and movement, selection, layout controls, and starter templates. The production build includes TypeScript checking.
