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
  Blue = 'blue',
  DeepPurple = 'deep-purple',
  Rose = 'rose',
  Red = 'red',
  Orange = 'orange',
  Amber = 'amber',
  Green = 'green',
  Teal = 'teal',
  BlueGrey = 'blue-grey',
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
