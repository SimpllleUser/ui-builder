/** What a click can do. The values are saved in project files, so they must not change. */
export enum ActionType {
  Navigate = 'navigate',
  Set = 'set',
  Toggle = 'toggle',
}

/** The kind of control an inspector setting is drawn with. */
export enum FieldKind {
  Text = 'text',
  Textarea = 'textarea',
  Select = 'select',
  Switch = 'switch',
  IconPicker = 'icon-picker',
  TableEditor = 'table-editor',
  Json = 'json',
  Slider = 'slider',
  Row = 'row',
  IconSlots = 'icon-slots',
  Spacing = 'spacing',
  FlexLayout = 'flex-layout',
  Typography = 'typography',
  CustomClasses = 'custom-classes',
}

/** Where the component library files a component. */
export enum ComponentCategory {
  Layout = 'Layout',
  Content = 'Content',
  Actions = 'Actions',
  Forms = 'Forms',
  Navigation = 'Navigation',
  ListsAndData = 'Lists & data',
  Feedback = 'Feedback',
  Media = 'Media',
  Utility = 'Utility',
  Other = 'Other',
}

export enum TemplateKind {
  Card = 'card',
  Form = 'form',
  Columns = 'columns',
  Dashboard = 'dashboard',
  Table = 'table',
  Login = 'login',
  Testimonials = 'testimonials',
  Footer = 'footer',
  Faq = 'faq',
  Onboarding = 'onboarding',
  Blog = 'blog',
  Contact = 'contact',
}

/** Margin or padding. The values are the prefixes of the utility classes (`mt-2`, `pa-4`). */
export enum SpacingType {
  Margin = 'm',
  Padding = 'p',
}

export enum ColumnAlign {
  Start = 'start',
  Center = 'center',
  End = 'end',
}

/** The two properties of a data table that hold its data. */
export enum TableData {
  Headers = 'headers',
  Items = 'items',
}

export enum SaveState {
  Saved = 'saved',
  Saving = 'saving',
  Error = 'error',
}

/** Which way an element or page moves in its list; the value is the step in the list. */
export enum StepDirection {
  Back = -1,
  Forward = 1,
}

/** What a problem found in a project is about. */
export enum IssueKind {
  UnknownVariable = 'unknown-variable',
  UnusedVariable = 'unused-variable',
  MissingRoute = 'missing-route',
  InvalidCondition = 'invalid-condition',
  EmptyTable = 'empty-table',
  MissingOutlet = 'missing-outlet',
  EmptyPage = 'empty-page',
}

/** How serious a problem is: an error breaks what the person built, a warning probably does, info is advice. */
export enum IssueSeverity {
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
}
