import type { Component } from 'vue';

export type CompCtor = Component | string;
export type CompName = 'VBtn' | 'VChip' | 'VAlert' | 'VRow' | 'VCol' | 'Div' | 'VExpansionPanels' | 'VExpansionPanel';

export type NodePropValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | NodePropValue[]
  | { [key: string]: NodePropValue };

export type NodeProps = Record<string, NodePropValue>;

export interface PaletteItem {
  id: number;
  type: CompCtor;
  name: CompName;
  props: NodeProps;
  children?: PaletteItem[];
}

export type SchemaField =
  | { key: string; label: string; input: 'text' }
  | { key: string; label: string; input: 'switch' }
  | { key: string; label: string; input: 'select'; options: string[] };

export type SchemaMap = Record<CompName, SchemaField[]>;
