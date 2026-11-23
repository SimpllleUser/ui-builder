# UI Builder: how to build pages with these tools

Work in this order: `get_document` → build → `check_project` → try it with `preview_*`.

## Building fast
- Prefer **`add_subtree`**: one call builds a whole nested tree (any depth) and is a single Undo step. Give elements a `ref` and the answer maps each ref to its node id.
- **`batch`** runs several tools as one Undo step. If a step fails, all earlier steps are put back. A later step can use an earlier result: `"$0.id"` is the `id` returned by step 0 (`"$1.refs.title"` works too).
- Component names are Vuetify (`VCard`, `VBtn`, `VTextField`, `VDataTable`…) plus `div`. See `list_components` and `describe_component`.

## Style
- Use **`set_style`** (or `style` in `update_node` / `add_subtree`). Numbers are pixels for lengths (`{ "padding": 16 }` → `16px`). Names may be kebab-case. A **theme colour name** (`primary`, `secondary`, `error`, `success`, `warning`, `info`, `surface`, `background`, `on-primary`…) becomes a colour that follows light/dark mode. Every value wins over utility classes such as `pa-4` or `rounded-lg`. `null` removes a property.
- Vuetify utility classes (`d-flex`, `ga-4`, `text-h5`) go in `classes`.

## Variables, bindings and events
- `set_state` defines a variable. A value is JSON (`3`, `true`, `"text"`, `[1,2]`), so give text without extra quotes only when it is plain text.
- Text and props accept `{{ name }}` and `{{ item.field }}`. Inside a repeated element (`vFor`) use `{{ item.field }}` and `{{ index }}`; inside a table cell slot use `{{ item.field }}` too.
- `model` links an input to a variable. `vIf` shows an element only when true: `open`, `!loading`, `status == paid`, `step >= 2`. `vFor` repeats for each item of an array variable (or `n` times).
- A click does one of: `{type:"navigate", to:"/path"}`, `{type:"set", key, value}`, `{type:"toggle", key}`. Dialogs, drawers and snackbars open with `model` plus a click.
- `{{ rows }}` alone keeps an array, so a table bound to a variable gets its rows.

## Tables
- Use `get_table`, then `add_table_column`, `add_table_row` and so on. Content of one cell goes in the slot `item.<column key>`.

## Check your work
- **`check_project`** lists problems (unknown variables, links to pages that do not exist, invalid conditions, empty tables, a layout without “Page content”). Fix every error.
- **`preview_start`** → **`preview_click`** / **`preview_input`** / **`preview_navigate`** → read the answer: variables, visible texts, hidden elements and table rows. Use `preview_reset` to start over and `preview_stop` when done. Preview never changes the document.
- `undo` takes back your last step.

## Safety
- Before a big change call **`create_checkpoint`**; if it goes wrong, **`restore_checkpoint`** (itself one Undo step). `get_history` lists the named steps; `restore_version` goes back to one.
- **`get_status`** is a cheap check of the page, variables, selection and whether Preview runs.
- **`save_component`** / **`insert_saved_component`** reuse an element; **`wrap_nodes`** / **`unwrap_node`** group or ungroup siblings.
