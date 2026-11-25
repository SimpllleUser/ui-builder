# UI Builder

A Vue 3 and Vuetify visual editor for composing pages from components.

```sh
npm install
npm run dev
```

Open http://localhost:3001.

## Editing

On a first visit to an empty project, a three-step **quick tour** points at the template choices, at selecting an element and at Preview. It moves on as you do each thing, can be skipped at any time, and is shown only once. Bring it back from **Help → Quick tour** or from the search (Ctrl/⌘ K → “tour”).

- The library opens with a short list: your **Favorites** (star a component on hover), the ones you used **Recently**, and eight **Popular** starters. **All components** unfolds the full list; searching always looks through everything.
- Click a component in the library or drag it onto a container. The library shows where clicking will insert it. Search filters the library.
- Start an empty page from a template: card, contact form, two columns, **Dashboard** (key numbers and a table), **Table with search** (search box, status filter, table and a details panel opening on click) or **Sign-in form** (fields that react in Preview). The last two bring the variables they need, and everything is one Undo step. Templates are also in the search (Ctrl/⌘ K → “template”) and MCP (`add_template`).
- Select elements on the canvas or in Layers. Shift/Ctrl/Cmd-click selects several; the inspector then edits shared spacing.
- The optional **Design** tab (**View → Design tab in Properties** turns it on or off) has Figma-style controls: width and height (fixed, fill or hug), auto layout with a 3 × 3 alignment grid, direction, wrap and gap, text alignment, margin and padding per side (with a link for all sides), corner radius for all or each corner, fill, text colour and stroke (each with the theme's colours as one-click presets, which follow light and dark mode, or any custom colour) and opacity. Drag a field's letter to change its value; hold Shift to move by ten. These write the element's own style and win over classes; the older tabs stay as they are.
- The inspector has a rail of tabs, each with its name and a one-line description: **Content**, **Layout**, **Style**, **Design** (when switched on) and **Behavior** are the everyday ones; **Advanced** (CSS utility classes) and **JSON** sit apart below a divider. The **Behavior** tab shows how many behaviors the element has as a small number. Text inside a button or heading can be edited directly from its parent's Content tab.
- **Search** (Ctrl/⌘ K, or the Search button) finds anything by typing: add a component ("data table"), go to a page, select an element by name, change a setting of the selected element ("striped", "header color"), preview, undo, export. Arrow keys move, Enter runs, Esc closes; recent commands come first.
- Hovering an element on the canvas outlines it and shows its name (and component type), so identical-looking elements can be told apart without clicking.
- A small toolbar floats next to the selected element: select its parent, move it up or down, edit its text, duplicate or delete it, without leaving the canvas.
- Rename a layer with F2, double-click, or its actions menu. Use arrow keys to navigate Layers, and Enter/Space to select.
- Drag layers to reorder or move between containers. The actions menu also offers Move up/down; the inspector's **Move to…** dialog can move an element to another container or named slot without dragging.
- Empty named slots are hidden behind **Add slot content…**. Unwrap is disabled while named slots contain content, so they cannot be accidentally discarded.
- Every change is named in **History** (“Added Data table”, “Changed Orders table: striped”, “Deleted page “Orders””) with when it happened. Whenever something is deleted or removed (an element, a page, a variable, a table column, the layout), the message that appears has an **Undo** button.
- Problems with what you type (a table column key that is taken, a page route, a variable name, a condition that cannot be read, a link to a page that does not exist) appear right under the field and stay until fixed, instead of in a message that fades.
- **Copy and paste** (Ctrl/⌘ C and V, or search) works between pages, projects and browser tabs. The variables the elements use come along when the target project does not have them. Pasting goes inside a selected container, next to a selected element that cannot hold content, and next to the original while it is still selected.
- **Screen sizes** follow Vuetify's grid, mobile first. The switch above the canvas offers **All**, **XS**, **SM** (from 600px), **MD** (960), **LG** (1280) and **XL** (1920). The element's own style is the base (All and XS); what you change in the Design tab on SM–XL applies from that width up, and **Reset to inherited** removes it. The width of a grid column is set per size as Vuetify's `cols`, `sm`, `md`, `lg`, `xl`. Preview and exported code use real `min-width` media queries. The canvas imitates the chosen width for these styles and for column widths; Vuetify's responsive utility classes (such as `d-md-none`) still follow the window, so check them in Preview.
- **On the canvas**, drag the handles of the selected element to change its width and height, or the green bars to change its padding (Shift: steps of ten). On a grid column the width snaps to the twelve columns. Hold **Alt** and point at another element to see the distances to it. A whole drag is one undo step.
- **Events** (Behavior tab): *when clicked* (a table: when a row is clicked), *when the value changes* (fields and controls; `{{ value }}`), *when the form is submitted* and *when it appears*. Each runs a chain of steps from the top: go to a page, set or switch a variable, add to or remove from a list, show a message, reset the form. **Then also…** adds a step.
- **Validation:** a form field can be required, an email address, or limited in length or number, each with its own message. Preview shows the broken rule under the field, and a form is submitted only when every rule passes; the button inside it needs the type **submit** (a new Form has it). Exported code carries the rules as `:rules`.
- **Computed variables** (Variables panel): `total = length(rows)`, `fullName = first + " " + last`, read by the same safe evaluator as conditions. They cannot be written, and one that would depend on itself is refused.
- **Data** (Variables panel → *Data* under a variable): import a JSON or CSV file (up to 500 KB) as its starting value, or name a **mock endpoint**. Preview then starts empty, waits the delay and fills the variable with its starting value, with an optional loading variable. Preview sends no request. Exported code calls the address with `fetch`, and a downloaded project holds the mock answer under `public` for a path such as `/api/orders`.
- Undo/Redo supports Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z. Text inputs keep native text undo. Property edits are grouped while typing; immediate Undo includes the latest edit.
- Save selected elements in **My components** for reuse.
- **Export code** (File → Export code…, or search): each page, the shared layout and each saved component as a Vue file, to copy or download.
- Small things that save time: the tooltips of Undo, Redo, Preview and the page tabs name their keyboard shortcuts (⌘ or Ctrl as fits your system); every “add” button looks the same and every delete uses the same icon; the inspector remembers how far you had scrolled in each tab.
- Places that start empty say what they are for and what to do first, in the same way: Properties with nothing selected, an element with no Behavior (it lists the four choices to click), Layers of an empty page (with a **Browse components** button), Variables, and My components. Preview of an empty page explains why it is blank and offers **Back to editor**. While Preview runs, a **N hidden** button in its bar lists the elements that “show only when” keeps out of sight right now: each with its condition and the current values of the variables it reads (and `× 3` when a repeat hides several copies), so “why is this not on the page?” has an answer.
- **Behavior guide** (Help → Behavior guide, or search): built-in documentation of conditions, repeats, clicks and variables with live examples and a playground.

## Saving and preview

You can keep several **projects**: the folder button in the top bar switches between them, creates one and opens **All projects** (rename, duplicate, export, delete). Each project has its own pages, checkpoints and theme; **My components** are shared between projects and tabs. Projects save automatically in this browser and restore on reload. The status beside the page name reports saving failures. Use **File → Export project** for a JSON backup or transfer, and **Import** (both in the **File** menu) to restore one. Import validates the document and adds it as a new project named after the file; the other projects stay as they are. The file carries the project's theme; a file without one gets the default theme. This is local browser storage, not cloud sync; clearing site data removes saved projects and components. Each tab keeps its own project open, and one tab edits a project at a time: another tab that opens it shows a read-only view with **Edit here**, which asks the first one to save and let go. A saved component is likewise edited in one tab at a time.

**Preview** hides the editor panels and uses an isolated viewport for Wide (1920), Desktop (1280), Laptop (1024), Tablet (768) and Mobile (390). Zoom changes the display scale independently of the viewport width. Use **Back to editor** or Escape to return. The route bar shows which page the preview is on (click it to jump to another page), **variables** lists their current values, and **Reset** puts every variable back to its starting value and returns to the page the preview opened on. Esc closes an open menu first, and leaves Preview when nothing else is open.

**Focus mode** (Ctrl/⌘ \\, **View → Focus mode** or the search) hides every panel, the toolbar and the page tabs so only the canvas is left; the quick actions, hover names, Preview and search keep working, and Esc brings everything back. Panel buttons hide/show the library and inspector. Drag their dividers to resize them, or focus a divider and use the arrow keys. On narrower screens, panels open as overlays.

The previous **Classic** editor is no longer in the menus, so there is one editor to learn. It is still reachable at `/?classic` (for example `http://localhost:3001/?classic`); it has a separate document that is not saved automatically, and **Back to editor** returns here.

## Pages, layout and interactions

- **Page tabs** under the top bar switch pages in one click (arrow keys, or Alt+[ / Alt+] anywhere); **+** adds a page and **⋮** renames, duplicates, reorders or deletes the current one. The editor reopens on the last page you used. **Pages & layout** manages the shared layout. A page is created empty; Undo/Redo covers the whole project.
- **Shared layout**: *Create layout* adds `VApp` with an app bar, a navigation drawer and `VMain` containing **Page content**, the place where the current page appears in Preview. Remove the layout to preview pages on their own.
- **Behavior** (inspector → Behavior tab; use **Add** to pick what the element does): a variable you type that does not exist yet is created on the spot, and its starting value can be changed in the **Variables** panel. Options: *Link to a variable* (`v-model`) binds a component to a variable, *Show only when…* (`v-if`) shows it conditionally (`open`, `!loading`, `status == paid`, `step >= 2`, `role == "admin" and not loading`, `contains(tags, "new")`; operators `== != < <= > >= && || ! and or not + - * / %` and `? :`, functions `length`, `empty`, `contains`), *Repeat for each item of…* (`v-for`) repeats it for each item of an array or `n` times (`{{ item.title }}`, `{{ index }}`), and *When clicked* can go to a page, set or switch a variable (`{{ item }}` stores a whole table row). Text and props accept `{{ name }}`; `{{ rows }}` alone keeps arrays for tables. Dialogs, snackbars and drawers open from `v-model` plus a click action.
- Interactions run only in Preview, starting from the initial state values each time, and never execute code: bindings read paths, conditions and actions are a fixed set.
- Behavior is visible while editing: an element that repeats, has a condition, is linked to a variable or reacts to a click carries a small marker on the canvas (`for · if · link · click`), an icon in Layers, and its hover badge says in words what it does (“Shown only when step >= 2”). Under the **Condition** field a line tells what Preview will do at the start with the variables' starting values (“this element is shown/hidden”), and the **?** button opens the Behavior guide on conditions. The line is left out when it cannot be known, for example when the condition reads `item`, which exists only inside a repeat. Below the field, **Insert** chips write a project variable (or `item` / `index` / `value` inside a repeat or a table cell) or a function (`empty()`, `contains()`, `length()`) at the caret without taking focus from the field; a half-typed name is completed instead of repeated. A condition that is still unfinished after a short pause in typing is pointed out gently (“Not finished yet: …”), and the full error appears when you leave the field. Saving a condition creates only the variables it reads, never words like `not` or `and`.
- Overlays (`VDialog`, `VMenu`, `VSnackbar`, `VTooltip`) are drawn inline on the canvas for editing and behave as real overlays in Preview. Text fields accept a mask such as `##.##.####`, applied in Preview when bound with `v-model`.
- Documents are saved as version 2 (`pages`, `layout`, `state`); version 1 files import as a single page.

## Feature guide

How the main features work, in the order you meet them. The short list above says what exists; this says how it behaves.

### Variables and bindings

- The **Structure** view (the sitemap icon in the left bar) shows the whole project as one plain tree, like a file explorer: pages, the shared layout and saved components as folders, elements inside them with the icon of their component and a tiny icon for each behavior. The chevron folds a branch, a click on a folder name opens that page, layout or component, a click on an element selects it, and the copy button at the top puts the tree on the clipboard as text with branch lines. The graph button at the top of the view (or search → “structure graph”) opens the same structure as a real **graph** in full screen: every element is a card with its icon, name and behavior icons, joined to what is inside it and placed automatically so nothing overlaps. Drag to move, scroll or pinch to zoom, use the mini map and the controls, pick a page, layout or component at the top and choose top-to-bottom or left-to-right; a click on a card selects that element in the editor. It uses the Vue Flow library for drawing and dagre for the placement. Layers stays the place to edit the tree of what is open now.
- The **Variables** panel (the `{x}` icon in the left bar) lists every variable with its kind (yes/no, number, text, list, record), an editable starting value, and where it is used: *Used in N elements*, or *Not used*. **Where it is used** lists the elements (with the page and how each uses it) and a click jumps to one, also on another page or in the layout. Add a variable at the top; deleting one that is used asks first and can be undone from the message that appears.
- The project keeps one set of **variables** (its state), stored in the document next to the pages. Each has a starting value. Preview copies the starting values every time it opens, changes its own copy, and **Reset** copies them again, so Preview never edits the document.
- A variable is created where it is first used (a behavior field, an action) with a starting value that fits: `false` for a condition or a switch, an empty list for a repeat, empty text for an input. Names use letters, digits and `_`, do not start with a digit, and the names `__proto__`, `constructor` and `prototype` are refused.
- Text and properties read variables with double curly braces around a **path**: `name`, `user.name`, `rows[0].title`. Mixed text is turned into text (a missing value becomes empty). A binding that is alone in a property keeps its type, so `rows` stays a list for a table. Paths are only read; no code is evaluated.
- Inside a repeated element or a table cell three more names exist: `item` (the current item), `index` (its position, starting at 0) and, in table cells, `value`. They are not project variables, so the check does not report them as unknown.

### Behavior in depth

Each element can carry up to four behaviors, edited in the inspector (Behavior tab, **Add**). They are stored on the element as `model`, `vIf`, `vFor` and `events.click`.

| Behavior | Stored as | What Preview does |
| --- | --- | --- |
| Link to a variable | `model` | Input and variable hold the same value; typing writes the variable, a change of the variable updates the input. A mask such as `##.##.####` formats what is typed. |
| Show only when… | `vIf` | The element is drawn only while the condition is true. |
| Repeat for each item | `vFor` | One copy per item of a list, or `n` copies for a number (at most 500). Each copy gets its own `item` and `index`. |
| When clicked | `events.click` | One action, described below. |

For one element the order is: repeat (once per item), then the condition of each copy (it can read `item`), then drawing, then bindings in its text and properties.

**Click actions**

- *Go to page* opens a route of the project. A route no page has is reported next to the field and by the check.
- *Set a variable* writes a value. The value is read as a literal: `5` is a number, `true` and `false` are yes/no values, `"text"` or plain text is text. A value that is a single binding (`item` in double curly braces) keeps its type, so a whole table row can be stored; the row is **copied**, so later changes to the table do not change what was stored.
- *Switch on/off* flips a yes/no variable.
- A click on an element inside a repeat, or on a table row, can use `item` in its action. An element outside every repeat has no `item`.

**Conditions** are small expressions. They are never run as code: the text is only turned into a syntax tree (by the `jsep` parser) and a fixed evaluator in `entities/ui-node/model/expression.ts` walks it. That is why a condition cannot reach the browser, call a method or touch prototypes.

| Group | Allowed |
| --- | --- |
| Values | numbers, `"text"` or `'text'`, `true`, `false`, `null`, lists such as `[1, 2]`, variable paths (`user.age`, `rows[0].title`) |
| Logic | `&&`, `and`, `||`, `or`, `!`, `not`, `a ? b : c`, parentheses |
| Compare | `==`, `!=` (compared as text, so `3` equals `"3"`), `===`, `!==` (same type required), `<`, `<=`, `>`, `>=` (both sides read as numbers) |
| Arithmetic | `+`, `-`, `*`, `/`, `%`; `+` joins text when either side is text |
| Functions | `length(x)` (text or list), `empty(x)` (nothing, empty text or an empty list), `contains(x, y)` (text contains a piece, or a list contains an item) |

Rules worth knowing:

- An **empty** condition shows the element. A condition that **cannot be read** also shows it in Preview (a typo never hides content), and the reason stays beside the field until it is fixed.
- A name that is not a variable, written next to `==` or `!=`, is read as text, so older conditions such as `status == paid` keep working. Quote text that has spaces or looks like a number: `city == "New York"`.
- A missing variable or a missing field is `undefined`: it is false in a condition, empty for `empty()`, and a comparison with it is false.
- Double curly braces are allowed inside a condition and mean the bare path (`status == {{status}}`), which is how saved-component parameters look.
- Anything else (assignment, `x.method()`, unknown functions, bit operators) is rejected with a message.

Examples:

```
open                                       a yes/no variable
!loading   /   not loading                 its opposite
step >= 2 and role == "admin"              two checks
not empty(email) and not contains(email, "@")
price * qty >= 100                         arithmetic
qty >= 1 and (vip or qty <= stock)         grouping
count > 0 ? ready : done                   conditional
row.status != "paid"                       a field of the current item
```

### Saved components and parameters

**My components** stores an element with its children. Write `props.name` in double curly braces anywhere in it (text, properties, classes, a condition, a repeat, a linked variable, a click action) and `name` becomes a **parameter** with a default; the inspector shows it as a field when the component is inserted. Parameters are filled in at insertion, so the `props.` prefix keeps them apart from the project variables that stay live in Preview. In a condition the value is inserted as one safe value (a number stays a number, text becomes quoted), so a value with spaces cannot change what the condition means.

### Checking a project

`check_project` (and the same check in the editor) reports: variables that are used but not defined (found in text, properties, links, repeats and inside conditions), links to pages that do not exist, conditions that cannot be read, empty tables, a layout without **Page content**, and variables nobody uses. Function names and the words `and`, `or`, `not` are not mistaken for variables.

### Export code

**Download project (.zip)** in the same dialog gives a whole Vue application: `npm install` and `npm run dev` run it. Pages become `src/pages` with routes, the shared layout `src/layouts`, saved components `src/components`, variables one Pinia store, and the theme `src/plugins/vuetify.js` with its styles. Components placed on pages are written into the pages themselves.

**File → Export code…** (or search → “export code”) opens a dialog with the code of one page, the shared layout or one saved component as a Vue single-file component, ready to **Copy** or **Download** (`OrderDesk.vue`). It opens on what you are editing; the list at the top switches to anything else.

What the file contains:

- A `<template>` with the same elements, props, classes, styles and slots (table cells included). `Link to a variable` becomes `v-model`, *Repeat* becomes `v-for="(item, index) in …"`, *Show only when* becomes `v-if`, text and property bindings become `{{ }}` and `:prop`. When an element has both a repeat and a condition, the repeat wraps it so the condition can still read `item`.
- A `<script setup>` with a `ref` for every variable the file uses, starting from the project's values, plus `useRouter` when a click goes to a page.
- Conditions are translated to JavaScript with the same result as in the editor (missing values read as `undefined`, `==` compares as text, `empty`, `contains` and `length` become small helper functions written at the top of the file). A test runs the exported JavaScript against the editor's evaluator on many conditions, and compiles the generated files with Vue's own compiler.
- A saved component has its parameters (`props.name`) as `defineProps`, so `props.name` in the template keeps working. The shared layout has `<RouterView />` where the page goes.

Things to know about a single file: it has its own copy of the variables (the downloaded project shares them); input masks are not exported; table stripes, borders and header colours are CSS classes from `src/shared/tableStyles.css`, so copy that file too. The generator is in `entities/ui-node/model/vueExport.ts`; the dialog is the `code-export` widget.

### The Behavior guide

The same material is built into the editor: **Help → Behavior guide**, or search (Ctrl/⌘ K → “behavior guide”). It has an address too: `/?guide` opens it and `/?guide=conditions` opens a section (`overview`, `variables`, `click`, `conditions`, `link`, `repeat`, `forms`, `data`, `components`, `checking`), so a link can be shared. It is a full-screen guide with one section per topic (how it works, variables, events and actions, conditions, link, repeat, forms and validation, computed and data, saved components, mistakes). Every example shows its sample variables and what Preview would do, using the same evaluator as Preview, and the **Conditions** section has a playground where you type your own condition and variables as JSON. Its text lives in `widgets/behavior-guide/model/guideContent.ts`; a test checks that every example in it is a readable condition and that its tables name every event, action and rule the editor offers.

## MCP access

`mcp/server.mjs` lets an MCP client (Claude Code, Claude Desktop, …) read and edit the page open in your browser. The page lives in the browser, so the server relays commands to the editor over a local bridge (`127.0.0.1:3002`, dev mode only).

1. `npm run dev` and open http://localhost:3001 (the tab must stay open).
2. Claude Code picks up `.mcp.json` automatically. For other clients, run `node mcp/server.mjs` over stdio.

Tools (60):

- **Projects:** `list_projects`, `create_project`, `open_project`, `rename_project`. Agents cannot delete projects, and `import_document` replaces the open one.
- **Read:** `get_document`, `get_node`, `list_components`, `describe_component`, `list_pages`, `get_table`, `export_document`.
- **Build:** `add_subtree` (a whole nested tree in one call and one Undo step; `ref` names come back as ids), `batch` (several tools as one Undo step; `"$0.id"` uses the result of step 0; if a step fails, all are undone), `add_component`, `add_template`, `move_node`, `duplicate_node`, `delete_node`, `import_document`.
- **Change:** `update_node`, `set_style` (numbers are px, theme colour names such as `primary`, and values win over utility classes, like the Design tab; `breakpoint` `sm`–`xl` styles a larger screen only), `set_binding`, `set_event`, `set_state`, and the table tools (`add_/update_/remove_table_column`, `add_/update_/remove_table_row`).
- **Pages:** `add_page`, `set_route`, `select_page`, `duplicate_page`, `move_page`, `delete_page`, `edit_layout`.
- **Check:** `check_project` (unknown variables, links to missing pages, invalid conditions, empty tables, a layout without Page content, unused variables) and a Preview you can drive: `preview_start`, `preview_click`, `preview_input`, `preview_navigate`, `preview_state`, `preview_reset`, `preview_stop`. Each answers with the variables, the texts shown, hidden elements and table rows.
- **History and reuse:** `get_status`, `get_history`, `create_checkpoint`, `restore_checkpoint`, `delete_checkpoint`, `restore_version`, `list_saved_components`, `save_component`, `insert_saved_component`, `delete_saved_component`, `wrap_nodes`, `unwrap_node`.
- `select_node`, `undo`, `redo`.

The server also gives agents instructions, a **guide** resource (`ui-builder://guide`, from `mcp/guide.md`) with the editor's conventions, and a `build_page` prompt. Every change goes through the editor's store, so it appears live and can be undone. Change the port with `UI_BUILDER_MCP_PORT` (and `VITE_MCP_BRIDGE_URL` for the editor); see `.env.mcp.example`.

## Code structure

The code follows Feature-Sliced Design, from the top layer down:

- `src/app`: the application shell (`App.vue`, `BuilderApp.vue`, and in `shell/` the panels, keyboard shortcuts, focus mode and project files). It puts the other layers together.
- `src/modules/ui-builder/widgets/*`: blocks of the interface (canvas, layers, properties, search, component library, pages, quick tour, Behavior guide, code export).
- `src/modules/projects`: several local projects: the repository (IndexedDB) in `entities/project`, opening, saving and tab locking in `features/manage-projects`, the switcher and dialogs in `widgets/project-switcher`.
- `src/modules/ui-builder/features/mcp-bridge`: lets an MCP client edit the page open in the browser.
- `src/modules/ui-builder/entities/ui-node`: the document, its store, validation and rendering. Conditions are read in `model/expression.ts` (parser `jsep` plus a fixed evaluator) and used by `model/runtime.ts`, the preview snapshot and the project check.
- `src/shared`: code with no knowledge of the editor (icons, DOM helpers, `useCheckedDrafts`, table styles).

Every slice has a public API in its `index.ts`. Code outside a slice imports from there and never from files inside it, a layer imports only from layers below it, and slices of the same layer do not import each other (they are combined in `app`, for example through a slot or by passing what they need in). Fixed sets of values are enums, not union types.

## Checks

```sh
npm test
npm run build
npm run format:check   # Prettier; npm run format fixes
```

The tests (in `tests/`, one file per area, sharing `tests/support.mjs`) cover history and undo, document import and migration, pages and layout, bindings and the preview runtime, tables, templates, MCP, and the search, library and tour models. The production build includes TypeScript checking.
