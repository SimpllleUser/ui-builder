/** What a click can do. The values are saved in project files, so they must not change. */
export enum ActionType {
  Navigate = 'navigate',
  Set = 'set',
  Toggle = 'toggle',
  Append = 'append',
  Remove = 'remove',
  Notify = 'notify',
  ResetForm = 'resetForm',
}

/** When an element's actions run. The values are saved in project files. */
export enum EventName {
  Click = 'click',
  Change = 'change',
  Submit = 'submit',
  Mounted = 'mounted',
}

/** A check of what a form field holds. The values are saved in project files. */
export enum RuleType {
  Required = 'required',
  Email = 'email',
  MinLength = 'minLength',
  MaxLength = 'maxLength',
  Min = 'min',
  Max = 'max',
}

/** How a click on an element reaches its action; the values are the events listened to. */
export enum ClickEvent {
  Element = 'click',
  /** A data table reports which row was clicked. */
  Row = 'click:row',
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
  Landing = 'landing',
  Settings = 'settings',
  Wizard = 'wizard',
  Pricing = 'pricing',
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

/**
 * Vuetify's grid breakpoints, mobile first: what is set for one applies to it and every larger screen.
 * The values are Vuetify's names and are saved in project files.
 */
export enum Breakpoint {
  Xs = 'xs',
  Sm = 'sm',
  Md = 'md',
  Lg = 'lg',
  Xl = 'xl',
}

/** Which way an element or page moves in its list; the value is the step in the list. */
export enum StepDirection {
  Back = -1,
  Forward = 1,
}

/** What a problem found in a project is about. */
export enum IssueKind {
  UnknownVariable = 'unknown-variable',
  UnusableName = 'unusable-name',
  UnusedVariable = 'unused-variable',
  MissingVariable = 'missing-variable',
  MissingRoute = 'missing-route',
  InvalidCondition = 'invalid-condition',
  EmptyTable = 'empty-table',
  MissingOutlet = 'missing-outlet',
  EmptyPage = 'empty-page',
  ReadOnlyVariable = 'read-only-variable',
  MissingForm = 'missing-form',
  InvalidRule = 'invalid-rule',
  InvalidFormula = 'invalid-formula',
  InvalidParameter = 'invalid-parameter',
}

/** How serious a problem is: an error breaks what the person built, a warning probably does, info is advice. */
export enum IssueSeverity {
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
}

/** What a parameter of a saved component holds. Values are written as text; the type says which texts are valid. */
export enum PrefabPropType {
  Text = 'text',
  Number = 'number',
  Boolean = 'boolean',
  Choice = 'choice',
  Color = 'color',
  Link = 'link',
}
