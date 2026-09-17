export type CompCtor = any;
export type CompName = 'VBtn' | 'VChip' | 'VAlert' | 'VRow' | 'VCol' | 'Div' | 'VExpansionPanels' | 'VExpansionPanel';

export interface PaletteItem {
  id: number;
  type: CompCtor;
  name: CompName;
  props: Record<string, any>;
  children?: PaletteItem[];
}

export type SchemaField =
  | { key: string; label: string; input: 'text' }
  | { key: string; label: string; input: 'switch' }
  | { key: string; label: string; input: 'select'; options: string[] };

export type SchemaMap = Record<CompName, SchemaField[]>;
