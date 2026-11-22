# UI Builder

A Vue 3 and Vuetify visual editor for composing pages from components.

```sh
npm install
npm run dev
```

Open http://localhost:3001.

## Editing

On a first visit to an empty project, a three-step **quick tour** points at the template choices, at selecting an element and at Preview. It moves on as you do each thing, can be skipped at any time, and is shown only once. Bring it back from the ⋯ menu or from the search (Ctrl/⌘ K → “tour”).

- The library opens with a short list: your **Favorites** (star a component on hover), the ones you used **Recently**, and eight **Popular** starters. **All components** unfolds the full list; searching always looks through everything.
- Click a component in the library or drag it onto a container. The library shows where clicking will insert it. Search filters the library.
- Start an empty page from a template: card, contact form, two columns, **Dashboard** (key numbers and a table), **Table with search** (search box, status filter, table and a details panel opening on click) or **Sign-in form** (fields that react in Preview). The last two bring the variables they need, and everything is one Undo step. Templates are also in the search (Ctrl/⌘ K → “template”) and MCP (`add_template`).
- Select elements on the canvas or in Layers. Shift/Ctrl/Cmd-click selects several; the inspector then edits shared spacing.
- Use the inspector's Content, Layout, Style and Advanced tabs. Text inside a button or heading can be edited directly from its parent's Content tab.
- **Search** (Ctrl/⌘ K, or the Search button) finds anything by typing: add a component ("data table"), go to a page, select an element by name, change a setting of the selected element ("striped", "header color"), preview, undo, export. Arrow keys move, Enter runs, Esc closes; recent commands come first.
- Hovering an element on the canvas outlines it and shows its name (and component type), so identical-looking elements can be told apart without clicking.
- A small toolbar floats next to the selected element: select its parent, move it up or down, edit its text, duplicate or delete it, without leaving the canvas.
- Rename a layer with F2, double-click, or its actions menu. Use arrow keys to navigate Layers, and Enter/Space to select.
- Drag layers to reorder or move between containers. The actions menu also offers Move up/down; the inspector's **Move to…** dialog can move an element to another container or named slot without dragging.
- Empty named slots are hidden behind **Add slot content…**. Unwrap is disabled while named slots contain content, so they cannot be accidentally discarded.
- Every change is named in **History** (“Added Data table”, “Changed Orders table: striped”, “Deleted page “Orders””) with when it happened. Whenever something is deleted or removed (an element, a page, a variable, a table column, the layout), the message that appears has an **Undo** button.
- Problems with what you type (a table column key that is taken, a page route, a variable name, a condition that cannot be read, a link to a page that does not exist) appear right under the field and stay until fixed, instead of in a message that fades.
- Undo/Redo supports Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z. Text inputs keep native text undo. Property edits are grouped while typing; immediate Undo includes the latest edit.
- Save selected elements in **My components** for reuse.

## Saving and preview

Pages save automatically in this browser and restore on reload. The status beside the page name reports saving failures. Use **Export** for a JSON backup or transfer, and **Import** (both in the ⋯ menu) to restore one. Import validates the document before replacing the page, and can be undone. This is local browser storage, not cloud sync; clearing site data removes saved pages and components.

**Preview** hides the editor panels and uses an isolated viewport for Desktop (1280), Tablet (768) and Mobile (390). Zoom changes the display scale independently of the viewport width. Use **Back to editor** or Escape to return. The route bar shows which page the preview is on (click it to jump to another page), **variables** lists their current values, and **Reset** puts every variable back to its starting value and returns to the page the preview opened on. Esc closes an open menu first, and leaves Preview when nothing else is open.

**Focus mode** (Ctrl/⌘ \\, the ⋯ menu or the search) hides every panel, the toolbar and the page tabs so only the canvas is left; the quick actions, hover names, Preview and search keep working, and Esc brings everything back. Panel buttons hide/show the library and inspector. Drag their dividers to resize them, or focus a divider and use the arrow keys. On narrower screens, panels open as overlays.

The previous **Classic** editor is no longer in the menus, so there is one editor to learn. It is still reachable at `/?classic` (for example `http://localhost:3001/?classic`); it has a separate document that is not saved automatically, and **Back to editor** returns here.

## Pages, layout and interactions

- **Page tabs** under the top bar switch pages in one click (arrow keys, or Alt+[ / Alt+] anywhere); **+** adds a page and **⋮** renames, duplicates, reorders or deletes the current one. The editor reopens on the last page you used. **Pages & variables** manages the shared layout and variables. A page is created empty; Undo/Redo covers the whole project.
- **Shared layout**: *Create layout* adds `VApp` with an app bar, a navigation drawer and `VMain` containing **Page content**, the place where the current page appears in Preview. Remove the layout to preview pages on their own.
- **Behavior** (inspector → Advanced, at the top; use **Add** to pick what the element does): a variable you type that does not exist yet is created on the spot, and its starting value can be changed under the field. Options: *Link to a variable* (`v-model`) binds a component to a variable, *Show only when…* (`v-if`) shows it conditionally (`open`, `!loading`, `status == paid`, `step >= 2`), *Repeat for each item of…* (`v-for`) repeats it for each item of an array or `n` times (`{{ item.title }}`, `{{ index }}`), and *When clicked* can go to a page, set or switch a variable (`{{ item }}` stores a whole table row). Text and props accept `{{ name }}`; `{{ rows }}` alone keeps arrays for tables. Dialogs, snackbars and drawers open from `v-model` plus a click action.
- Interactions run only in Preview, starting from the initial state values each time, and never execute code: bindings read paths, conditions and actions are a fixed set.
- Overlays (`VDialog`, `VMenu`, `VSnackbar`, `VTooltip`) are drawn inline on the canvas for editing and behave as real overlays in Preview. Text fields accept a mask such as `##.##.####`, applied in Preview when bound with `v-model`.
- Documents are saved as version 2 (`pages`, `layout`, `state`); version 1 files import as a single page.

## MCP access

`mcp/server.mjs` lets an MCP client (Claude Code, Claude Desktop, …) read and edit the page open in your browser. The page lives in the browser, so the server relays commands to the editor over a local bridge (`127.0.0.1:3002`, dev mode only).

1. `npm run dev` and open http://localhost:3001 (the tab must stay open).
2. Claude Code picks up `.mcp.json` automatically. For other clients, run `node mcp/server.mjs` over stdio.

Tools: `get_document`, `list_pages`, `add_page`, `set_route`, `select_page`, `delete_page`, `edit_layout`, `set_state`, `set_binding`, `set_event`, `describe_component`, `get_table`, `add_table_column`, `update_table_column`, `remove_table_column`, `add_table_row`, `update_table_row`, `remove_table_row`, `get_node`, `list_components`, `add_component`, `update_node`, `delete_node`, `move_node`, `duplicate_node`, `add_template`, `select_node`, `undo`, `redo`, `export_document`, `import_document`. Every change goes through the editor's store, so it appears live and can be undone. Change the port with `UI_BUILDER_MCP_PORT` (and `VITE_MCP_BRIDGE_URL` for the editor); see `.env.mcp.example`.

## Checks

```sh
npm test
npm run build
npm run format:check   # Prettier; npm run format fixes
```

The tests (in `tests/`, one file per area, sharing `tests/support.mjs`) cover history and undo, document import and migration, pages and layout, bindings and the preview runtime, tables, templates, MCP, and the search, library and tour models. The production build includes TypeScript checking.
