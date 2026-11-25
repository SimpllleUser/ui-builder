/** Which of the two themes is shown. System follows the operating system. */
export enum ThemeMode {
  Light = 'light',
  Dark = 'dark',
  System = 'system',
}

/** The two colour sets a Vuetify theme holds. */
export enum ThemeVariant {
  Light = 'light',
  Dark = 'dark',
}

/** Brand colour pairs. Default keeps the colours the app ships with; Custom uses the two colours the user picked. */
export enum ColorPreset {
  Default = 'default',
  /** Near-black on light, near-white on dark. */
  Ink = 'ink',
  Blue = 'blue',
  DeepPurple = 'deep-purple',
  Rose = 'rose',
  Red = 'red',
  Orange = 'orange',
  Amber = 'amber',
  Green = 'green',
  Teal = 'teal',
  BlueGrey = 'blue-grey',
  Stripe = 'stripe',
  Discord = 'discord',
  Twitch = 'twitch',
  Figma = 'figma',
  Custom = 'custom',
}

/** Success, info, warning and error colours. Default keeps the colours the app ships with. */
export enum SemanticPreset {
  Default = 'default',
  Material = 'material',
  Modern = 'modern',
  Pastel = 'pastel',
  Vibrant = 'vibrant',
  Nordic = 'nordic',
  Corporate = 'corporate',
  Cyberpunk = 'cyberpunk',
  Brutal = 'brutal',
}

/** Background and surface colours. Default keeps the colours the app ships with. */
export enum SurfacePreset {
  Default = 'default',
  Zinc = 'zinc',
  Slate = 'slate',
}

export enum ThemeDensity {
  Default = 'default',
  Comfortable = 'comfortable',
  Compact = 'compact',
}

export enum CardStyle {
  Elevated = 'elevated',
  Outlined = 'outlined',
}

/** Material keeps ripples and raised buttons; Modern uses flat buttons without ripples or capital letters. */
export enum InteractiveStyle {
  Material = 'material',
  Modern = 'modern',
}

/** How raised cards and buttons cast their shadow. Default keeps Vuetify's own. */
export enum ShadowProfile {
  Default = 'default',
  Soft = 'soft',
  Crisp = 'crisp',
  NeoBrutal = 'neo-brutal',
}

/** Font family and type scale of the page being built. Default keeps Vuetify's own. */
export enum TypographyStyle {
  Default = 'default',
  Modern = 'modern',
  Friendly = 'friendly',
  Editorial = 'editorial',
  Bold = 'bold',
}

/** How much room cards, grids, tables and lists get. Default keeps Vuetify's own. */
export enum SpacingScale {
  Default = 'default',
  Tight = 'tight',
  Balanced = 'balanced',
  Airy = 'airy',
}

/** How text fields and selects are drawn. Default follows each field's variant. */
export enum FieldStyle {
  Default = 'default',
  Refined = 'refined',
  Filled = 'filled',
}

/** A ready combination of every look setting. */
export enum DesignPreset {
  Material = 'material',
  Minimal = 'minimal',
  Soft = 'soft',
  Editorial = 'editorial',
  Dashboard = 'dashboard',
  Bold = 'bold',
}

/** A bundled font with Cyrillic letters. Default leaves the choice to the typography style. */
export enum FontFamily {
  Default = 'default',
  Inter = 'inter',
  Manrope = 'manrope',
  Onest = 'onest',
  Montserrat = 'montserrat',
  Rubik = 'rubik',
  Nunito = 'nunito',
  Unbounded = 'unbounded',
  SourceSerif = 'source-serif',
  PlayfairDisplay = 'playfair-display',
  JetBrainsMono = 'jetbrains-mono',
}
