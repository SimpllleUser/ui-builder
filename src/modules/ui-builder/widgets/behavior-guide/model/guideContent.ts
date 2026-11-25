/** The text of the Behavior guide, kept apart from the drawing so it can be read and changed as plain data. */

export enum GuideSection {
  Overview = 'overview',
  Variables = 'variables',
  Click = 'click',
  Conditions = 'conditions',
  Link = 'link',
  Repeat = 'repeat',
  Forms = 'forms',
  Data = 'data',
  Components = 'components',
  Checking = 'checking',
}

export const isGuideSection = (value: unknown): value is GuideSection =>
  Object.values(GuideSection).some(id => id === value)

export enum GuideBlockKind {
  Paragraph = 'paragraph',
  List = 'list',
  Code = 'code',
  Table = 'table',
  /** A condition with sample variables and what Preview would do with it. */
  Example = 'example',
  /** Two fields where the reader types their own condition and variables. */
  Playground = 'playground',
}

export type GuideBlock =
  | { kind: GuideBlockKind.Paragraph; text: string }
  | { kind: GuideBlockKind.List; items: string[] }
  | { kind: GuideBlockKind.Code; text: string }
  | { kind: GuideBlockKind.Table; headers: string[]; rows: string[][] }
  | { kind: GuideBlockKind.Example; condition: string; variables: Record<string, unknown>; note: string }
  | { kind: GuideBlockKind.Playground }

export interface GuideSectionContent {
  id: GuideSection
  title: string
  icon: string
  blocks: GuideBlock[]
}

const paragraph = (text: string): GuideBlock => ({ kind: GuideBlockKind.Paragraph, text })
const list = (...items: string[]): GuideBlock => ({ kind: GuideBlockKind.List, items })
const code = (text: string): GuideBlock => ({ kind: GuideBlockKind.Code, text })
const example = (condition: string, variables: Record<string, unknown>, note: string): GuideBlock => ({
  kind: GuideBlockKind.Example,
  condition,
  variables,
  note,
})

export const GUIDE_SECTIONS: GuideSectionContent[] = [
  {
    id: GuideSection.Overview,
    title: 'How it works',
    icon: 'mdi-lightbulb-on-outline',
    blocks: [
      paragraph(
        'Behavior makes an element react in Preview: act on a click or another event, appear only when something is true, stay in sync with an input, repeat for every item of a list, or check what was typed. Select an element, open the Behavior tab in the inspector and press Add.',
      ),
      paragraph(
        'The project keeps a set of variables (its state). Behavior only reads and changes those variables, and the page is redrawn from them. Nothing runs while you edit. Preview starts from the starting values every time, works on its own copy and never changes the document, so you can try anything and press Reset.',
      ),
      list(
        'Events: run actions when an element is clicked, a value changes, a form is submitted or an element appears.',
        'Show only when (v-if): the element is drawn only while the condition is true.',
        'Link to a variable (v-model): an input and a variable always hold the same value.',
        'Repeat for each item (v-for): one copy of the element for every item of a list.',
        'Validate the value (rules): a form field must be filled in, look like an email or stay within limits.',
      ),
      paragraph(
        'For one element the order is: repeat (once per item), then the condition of each copy (it can read that copy’s item), then drawing, then bindings in its text and properties.',
      ),
      paragraph(
        'Safety: conditions are never run as code. The text is turned into a syntax tree and a small fixed evaluator reads it, so a condition cannot reach the browser, call a method or touch prototypes.',
      ),
    ],
  },
  {
    id: GuideSection.Variables,
    title: 'Variables and bindings',
    icon: 'mdi-database-outline',
    blocks: [
      paragraph(
        'A variable you type in a behavior field is created on the spot, with a starting value that fits (false for a condition, an empty list for a repeat, empty text for an input). Change the starting value right under the field. A name uses letters, digits and _, does not start with a digit, and cannot be __proto__, constructor or prototype.',
      ),
      paragraph(
        'Text and properties read a variable with double curly braces around a path: name, user.name or rows[0].title. Mixed text is turned into text and a missing value becomes empty. A binding that stands alone in a property keeps its type, so a list stays a list (this is how a table receives its rows).',
      ),
      code(
        'Hello, {{ user.name }}!        text with a binding\n{{ rows }}                      alone: keeps the list for a table',
      ),
      paragraph('A variable can also be computed from others, or loaded from a mock endpoint. See Computed and data.'),
      paragraph(
        'Inside a repeated element or a table cell three more names exist: item (the current item), index (its position, starting at 0) and, in table cells, value. They are not project variables, so the check does not report them as unknown.',
      ),
    ],
  },
  {
    id: GuideSection.Click,
    title: 'Events and actions',
    icon: 'mdi-cursor-default-click-outline',
    blocks: [
      paragraph('An event says when something happens. Which events an element offers depends on what it is:'),
      {
        kind: GuideBlockKind.Table,
        headers: ['Event', 'When it runs'],
        rows: [
          ['When clicked', 'On a click. On a data table it is a click on a row, and item is that row.'],
          [
            'When the value changes',
            'When the person changes a field or a control (tabs, button toggle, pagination, date picker). value is the new value.',
          ],
          ['When the form is submitted', 'On a Form, and only when every rule of its fields passes.'],
          [
            'When it appears',
            'Each time the element is drawn: when Preview starts, after Reset, and when a condition or a page change brings it back.',
          ],
        ],
      },
      paragraph(
        'An event runs one action or a chain of them. Press Then also to add a step; the arrows change the order. Steps run from the top, and each one sees what those before it changed.',
      ),
      {
        kind: GuideBlockKind.Table,
        headers: ['Action', 'What it does'],
        rows: [
          ['Go to page', 'Opens a route of the project. A route that no page has is reported beside the field.'],
          ['Set a variable', 'Writes a value: 5 is a number, true and false are yes/no values, anything else is text.'],
          ['Switch a variable on/off', 'Flips a yes/no variable.'],
          [
            'Add to a list',
            'Puts a value at the end of a list: text, a binding that keeps its type, or JSON with bindings inside its texts.',
          ],
          ['Remove from a list', 'Takes out the first entry equal to the value.'],
          ['Show a message', 'Shows a short message at the bottom of the screen. It may contain bindings.'],
          ['Reset the form', 'Puts the linked variables of the surrounding form back to their starting values.'],
        ],
      },
      paragraph(
        'Inside a repeat or on a table row the value may be item in double curly braces. When it is alone it keeps its type, so a whole row can be stored. The row is copied, so later changes to the table do not change what was stored. An element outside every repeat has no item.',
      ),
      code(
        'Set:     key = mode      value = dark\nSwitch:  key = menuOpen\nStore:   key = selected  value = {{ item }}\nAdd:     key = contacts  value = {"name": "{{ name }}"}\nRemove:  key = contacts  value = {{ item }}\nMessage: Saved {{ value }}',
      ),
      paragraph(
        'Dialogs, snackbars and drawers open from a variable linked to them plus a click action that switches it.',
      ),
      paragraph(
        'An action that has no variable chosen yet does nothing. If “When it appears” actions keep making elements appear, Preview stops them and says so.',
      ),
    ],
  },
  {
    id: GuideSection.Conditions,
    title: 'Show only when',
    icon: 'mdi-eye-outline',
    blocks: [
      paragraph(
        'A condition is an expression. While it is true the element is drawn, otherwise it is hidden. An empty condition shows the element. A condition that cannot be read stays in the field with the reason beside it, and Preview shows the element instead of silently hiding it.',
      ),
      {
        kind: GuideBlockKind.Table,
        headers: ['Group', 'Allowed'],
        rows: [
          [
            'Values',
            'numbers, "text" or \'text\', true, false, null, lists such as [1, 2], variable paths (user.age, rows[0].title)',
          ],
          ['Logic', '&&, and, ||, or, !, not, a ? b : c, parentheses'],
          [
            'Compare',
            '==, != (compared as text, so 3 equals "3"), ===, !== (same type), <, <=, >, >= (both sides read as numbers)',
          ],
          ['Arithmetic', '+, -, *, /, %   (+ joins text when either side is text)'],
          [
            'Functions',
            'length(x) for a text or list, empty(x) for nothing, empty text or an empty list, contains(x, y) for a piece of text or an item of a list',
          ],
        ],
      },
      list(
        'A missing variable or field is undefined: false in a condition, empty for empty(), and any comparison with it is false.',
        'A name that is not a variable, next to == or !=, is read as text, so older conditions such as status == paid keep working. Quote text that has spaces or looks like a number: city == "New York".',
        'Double curly braces are allowed inside a condition and mean the bare path. This is how saved-component parameters look.',
        'Anything else (assignment, x.method(), unknown functions, bit operators) is refused with a message.',
      ),
      paragraph('Examples, each with sample variables and what Preview does:'),
      example('open', { open: true }, 'A yes/no variable.'),
      example('not empty(email) and not contains(email, "@")', { email: 'ann' }, 'Show a warning for a bad email.'),
      example('price * qty >= 100', { price: 59, qty: 2 }, 'Arithmetic: free shipping from 100.'),
      example(
        'qty >= 1 and (vip or qty <= stock)',
        { qty: 5, vip: false, stock: 3 },
        'Grouping: only a VIP may order more than the stock.',
      ),
      example('city == "New York"', { city: 'New York' }, 'Text with a space needs quotes.'),
      example('status == paid', { status: 'paid' }, 'The older form without quotes still works.'),
      example(
        'count > 0 ? ready : done',
        { count: 2, ready: true, done: false },
        'Conditional: pick one of two values.',
      ),
      example('row.status != "paid"', { row: { status: 'open' } }, 'A field of the current item.'),
      paragraph('Try your own. Change the condition or the variables and watch the answer:'),
      { kind: GuideBlockKind.Playground },
    ],
  },
  {
    id: GuideSection.Link,
    title: 'Link to a variable',
    icon: 'mdi-link-variant',
    blocks: [
      paragraph(
        'Put it on an input, a checkbox or a switch. Typing changes the variable, and changing the variable (by a click, or by another input linked to it) updates the input. Every other element reads the same variable in text and conditions, so the page follows what the user types.',
      ),
      list(
        'A text field can also have a mask such as ##.##.#### (# is a digit, A a letter). It formats what is typed in Preview.',
        'A variable you type that does not exist yet is created, with an empty value.',
        'To act on what the person changes, add the event “When the value changes”. It runs after the variable is updated.',
      ),
      example('not empty(name)', { name: 'Ann' }, 'Show a greeting only after the name is typed.'),
      example('length(name) > 3', { name: 'Ann' }, 'React to how much was typed.'),
    ],
  },
  {
    id: GuideSection.Repeat,
    title: 'Repeat for each item',
    icon: 'mdi-repeat',
    blocks: [
      paragraph(
        'Give it a list variable and the element, with everything inside it, is drawn once per item. Inside it item is the current item and index its position (starting at 0), so item.name reads the field name. If the variable is a number n, the element is repeated n times (at most 500). A variable that is not a list gives no copies.',
      ),
      paragraph(
        'Each copy has its own conditions: the same badge can show for one item and not for another, because item is different in every copy. A click inside a copy can store that copy’s item.',
      ),
      example('item.stock == 0', { item: { name: 'Plum', stock: 0 } }, 'Out-of-stock badge for the third fruit.'),
      example('item.stock > 0 and item.stock < 5', { item: { name: 'Pear', stock: 2 } }, 'Running-low badge.'),
      example(
        'not empty(picked) and picked.stock > 0',
        { picked: { name: 'Apple', stock: 12 } },
        'Read the stored item.',
      ),
    ],
  },
  {
    id: GuideSection.Forms,
    title: 'Forms and validation',
    icon: 'mdi-form-select',
    blocks: [
      paragraph(
        'Rules check what a field holds. Select a text field, textarea, select, autocomplete, file input, checkbox, switch, slider or radio group, add “Validate the value” and choose the rules. Preview shows the first broken rule under the field.',
      ),
      {
        kind: GuideBlockKind.Table,
        headers: ['Rule', 'Passes when'],
        rows: [
          ['Required', 'The field holds something. An unchecked checkbox or switch does not count.'],
          ['Email address', 'The text looks like name@example.com.'],
          ['Minimum length', 'The text or the chosen list has at least that many characters or entries.'],
          ['Maximum length', 'It has at most that many.'],
          ['Smallest number', 'The value, read as a number, is that number or more.'],
          ['Largest number', 'It is that number or less.'],
        ],
      },
      list(
        'An empty field passes every rule except Required, so an optional field can still have a format.',
        'Each rule may have its own message. A rule that needs a number and has none is ignored, and the check reports it.',
      ),
      paragraph('To send a form:'),
      list(
        'Put the fields inside a Form and link each one to a variable.',
        'Give the button inside it the type submit (Style tab, under Appearance). A new Form already has such a button.',
        'On the Form, add “When the form is submitted”. Its actions run only when every rule passes.',
      ),
      code(
        'Form · When the form is submitted\n  1. Add to a list     contacts ← {"name": "{{ name }}", "email": "{{ email }}"}\n  2. Show a message    Added {{ name }}\n  3. Reset the form',
      ),
      paragraph('Exported code carries the rules as the :rules of each field and checks the form before the actions.'),
    ],
  },
  {
    id: GuideSection.Data,
    title: 'Computed and data',
    icon: 'mdi-database-arrow-down-outline',
    blocks: [
      paragraph(
        'A computed variable is worked out from other variables and follows them. Add one at the bottom of the Variables panel. Its expression uses the same operators and functions as conditions.',
      ),
      code('total    = length(rows)\nfullName = first + " " + last\nisEmpty  = empty(rows)'),
      list(
        'Read it like any variable, in text, conditions and repeats. Actions and linked inputs cannot write to it.',
        'It may use other computed variables, but not itself, directly or through them.',
        'An expression that cannot be worked out gives nothing.',
      ),
      paragraph(
        'Under a variable, Data fills it from outside. Import a JSON or CSV file (up to 500 KB) and it becomes the starting value; in CSV the first row names the fields.',
      ),
      paragraph(
        'A mock endpoint imitates loading from a server. Enter an address such as /api/orders and a delay. Preview starts with the variable empty and fills it with its starting value after the delay. It sends no request.',
      ),
      list(
        'A loading variable is true while the data is on its way: use it in “Show only when” for a progress indicator.',
        'Exported code calls the address with fetch. A downloaded project answers a path with a file under public until there is a backend.',
      ),
      example('loading', { loading: true }, 'Show a progress indicator while the data loads.'),
      example('not loading and empty(orders)', { loading: false, orders: [] }, 'Say that there is nothing to show.'),
    ],
  },
  {
    id: GuideSection.Components,
    title: 'Saved components',
    icon: 'mdi-puzzle-outline',
    blocks: [
      paragraph(
        'My components stores an element with its children. Write props.name in double curly braces anywhere in it (text, properties, classes, a condition, a repeat, a linked variable, an action) and name becomes a parameter with a default value. Inserting it adds an instance that follows the original: change the component and every instance changes, while each keeps its own parameter values. Detach an instance to edit what is inside it. The props. prefix keeps parameters apart from the project variables, which stay live in Preview.',
      ),
      paragraph(
        'In a condition the value is inserted as one safe value: a number stays a number and text is put in quotes. So destination == (props.key) with the value New York becomes destination == "New York" and keeps working. If you already wrote the quotes yourself, the value goes between them as it is.',
      ),
      example(
        'destination == "home"',
        { destination: 'home' },
        'What the condition looks like after the parameter is filled in.',
      ),
    ],
  },
  {
    id: GuideSection.Checking,
    title: 'Checking and mistakes',
    icon: 'mdi-check-decagram-outline',
    blocks: [
      paragraph(
        'Turn Preview on and use the page. The check (check_project over MCP) reports variables that are used but not defined (in text, properties, links, repeats and inside conditions), links to pages that do not exist, conditions and computed expressions that cannot be read, writes to a computed variable, a form reset outside a form, rules without their number, empty tables and a layout without Page content.',
      ),
      list(
        'Text with spaces or a number-like word without quotes: write city == "New York", not city == New York.',
        'A typo in a variable name creates a new, empty variable, so the condition is never true. Look at the list of variables.',
        'A single = instead of ==, or a function that is not in the list (only length, empty and contains exist).',
        'Comparing a list or an object with ==: compare one of its fields instead (item.stock == 0).',
        'A form that does not send: its button needs the type submit, and every field must pass its rules.',
        'Behavior runs only in Preview. The editing canvas always shows every element so a hidden one can still be selected.',
      ),
    ],
  },
]
