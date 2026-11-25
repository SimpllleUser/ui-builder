# UI Builder: how to build pages with these tools

Work in this order: `get_document` → build → `check_project` → try it with `preview_*`.

## Projects
- The browser holds several projects; every tool edits the one that is open. `get_status` says which, `list_projects` lists them.
- Check it is the right one before changing anything. Switch with `open_project`, or start apart with `create_project`.
- One tab edits a project at a time. If a project is open in another tab, editor tools are refused: open a different project, or ask the person to press **Edit here** in this tab.
- Undo, history and checkpoints belong to one project; saved components are shared. Projects cannot be deleted by an agent.
- `import_document` replaces the **open** project (unlike Import in the editor's File menu, which adds a new one). `export_document` includes the theme and `import_document` applies it; `undo` restores the content, not the theme.

## Building fast
- Prefer **`add_subtree`**: one call builds a whole nested tree (any depth) and is a single Undo step. Give elements a `ref` and the answer maps each ref to its node id.
- **`batch`** runs several tools as one Undo step. If a step fails, all earlier steps are put back. A later step can use an earlier result: `"$0.id"` is the `id` returned by step 0 (`"$1.refs.title"` works too).
- Component names are Vuetify (`VCard`, `VBtn`, `VTextField`, `VDataTable`…) plus `div`. See `list_components` and `describe_component`.

## Style
- Use **`set_style`** (or `style` in `update_node` / `add_subtree`). Numbers are pixels for lengths (`{ "padding": 16 }` → `16px`). Names may be kebab-case. A **theme colour name** (`primary`, `secondary`, `error`, `success`, `warning`, `info`, `surface`, `background`, `on-primary`…) becomes a colour that follows light/dark mode. **Theme tokens** follow the theme: `space-xs`…`space-xl`, `space-2xl` for margin, padding and gap, `radius-sm|md|lg|full` for `borderRadius`, and `textStyle: "h1"`…`"h6" | "body" | "caption"` for typography. Prefer them to raw pixels. Every value wins over utility classes such as `pa-4` or `rounded-lg`. `null` removes a property.
- **Screen sizes** follow Vuetify's grid, mobile first. Style the phone layout first without `breakpoint`, then call `set_style` with `breakpoint: "sm" | "md" | "lg" | "xl"` (from 600, 960, 1280, 1920px) for only what differs on larger screens, e.g. `{ "id": "…", "style": { "flexDirection": "row" }, "breakpoint": "md" }`. `get_node` shows these under `responsive`. Column widths of `VCol` are not styles: set its `cols`, `sm`, `md`, `lg`, `xl` props with `update_node`.
- Vuetify utility classes (`d-flex`, `ga-4`, `text-h5`) go in `classes`.

## Theme
- **`get_theme`** / **`set_theme`** read and change the project's look: `{ settings: { preset: "minimal" } }`, `{ settings: { radius: 12, spacing: "airy", customPrimary: "#7c3aed" } }`. Spacing, radius and typography set what the tokens stand for, so elements that use tokens follow.
- The theme is not part of undo, history or checkpoints: read it first and ask before changing a look the person chose. These tools do not work in `batch`.

## Variables, bindings and events
- `set_state` defines a variable. A value is JSON (`3`, `true`, `"text"`, `[1,2]`), so give text without extra quotes only when it is plain text.
- Text and props accept `{{ name }}` and `{{ item.field }}`. Inside a repeated element (`vFor`) use `{{ item.field }}` and `{{ index }}`; inside a table cell slot use `{{ item.field }}` too.
- `model` links an input to a variable. `vIf` shows an element only when true: `open`, `!loading`, `status == paid`, `step >= 2`, `role == "admin" and not loading`, `contains(tags, "new")`, `count > 0 ? a : b` (operators `== != < <= > >= && || ! and or not + - * / %`, functions `length`, `empty`, `contains`). `vFor` repeats for each item of an array variable (or `n` times).
- **Events** (`set_event`, or `events` in `add_subtree`): `click`, `change` (fields; `{{ value }}`), `submit` (VForm), `mounted`. Each is one action or a list that runs in order: `{type:"navigate", to}`, `{type:"set", key, value}`, `{type:"toggle", key}`, `{type:"append", key, value}`, `{type:"remove", key, value}` (first equal entry; `{{ item }}` inside a repeat), `{type:"notify", message}`, `{type:"resetForm"}`. Dialogs, drawers and snackbars open with `model` plus a click.
- **Forms:** put linked fields in a `VForm`, give them `set_rules` (`required`, `email`, `minLength`, `maxLength`, `min`, `max`), set `props: { type: "submit" }` on the button and put the actions in the form's `submit`. They run only when every rule passes.
- **Computed variables:** `set_computed` (`total` = `length(rows)`). They cannot be written by actions or `model`.
- **Data:** give a list its sample rows with `set_state`, then `set_data_source` to make Preview load them from a mock endpoint, with an optional loading variable.
- `{{ rows }}` alone keeps an array, so a table bound to a variable gets its rows.

## Tables
- Use `get_table`, then `add_table_column`, `add_table_row` and so on. Content of one cell goes in the slot `item.<column key>`.

## Check your work
- **`check_project`** lists problems (unknown variables, links to pages that do not exist, invalid conditions, empty tables, a layout without “Page content”). Fix every error.
- **`preview_start`** → **`preview_click`** / **`preview_input`** / **`preview_submit`** / **`preview_navigate`** → read the answer: variables, visible texts, hidden elements and table rows. Data sources arrive after their delay and `mounted` actions run once the page is drawn, so ask `preview_state` again for them. Use `preview_reset` to start over and `preview_stop` when done. Preview never changes the document.
- `undo` takes back your last step.

## Safety
- Before a big change call **`create_checkpoint`**; if it goes wrong, **`restore_checkpoint`** (itself one Undo step). `get_history` lists the named steps; `restore_version` goes back to one.
- While the person edits a saved component, `get_history`, `undo`, `redo` and `restore_version` act on that component's own history (`scope` says which). Right after `delete_saved_component`, `undo` brings the component back.
- **`get_status`** is a cheap check of the page, variables, selection and whether Preview runs.
- **`save_component`** stores an element in My components (write `{{props.title}}` in a property to make it a parameter). **`insert_saved_component`** adds an **instance** of it (pass `props: { title: "Hi" }`): every instance follows the original, and nothing inside one can be edited. Change its parameters with **`update_instance`**, or **`detach_instance`** to get an editable copy.
- To change the **original**, call **`edit_saved_component`**, edit with the usual tools (the page is not what you are editing then; `get_status` shows `editing: { component }`), and call **`close_saved_component`**. Every instance, in every project, follows, so check with `list_saved_components` that it is the right one. It has its own `undo` and `get_history`. Templates cannot be added inside it, and these two tools do not work in `batch`.
- **`list_deleted_components`** / **`restore_saved_component`** bring back a deleted component.
- **`wrap_nodes`** / **`unwrap_node`** group or ungroup siblings.
