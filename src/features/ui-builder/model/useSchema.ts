import type { SchemaMap } from '../types';

export function useSchema() {
  const schema: SchemaMap = {
    Div: [],
    VBtn: [
      { key: 'text', label: 'Text', input: 'text' },
      {
        key: 'color',
        label: 'Color',
        input: 'select',
        options: ['primary', 'secondary', 'success', 'info', 'warning', 'error']
      },
      {
        key: 'variant',
        label: 'Variant',
        input: 'select',
        options: ['flat', 'elevated', 'tonal', 'outlined', 'text', 'plain']
      },
      { key: 'disabled', label: 'Disabled', input: 'switch' }
    ],
    VChip: [
      { key: 'text', label: 'Text', input: 'text' },
      {
        key: 'color',
        label: 'Color',
        input: 'select',
        options: ['primary', 'secondary', 'success', 'info', 'warning', 'error']
      },
      { key: 'label', label: 'Label', input: 'switch' }
    ],
    VAlert: [
      { key: 'text', label: 'Text', input: 'text' },
      { key: 'type', label: 'Type', input: 'select', options: ['info', 'success', 'warning', 'error'] },
      {
        key: 'variant',
        label: 'Variant',
        input: 'select',
        options: ['flat', 'elevated', 'tonal', 'outlined', 'text', 'plain']
      }
    ],
    VRow: [],
    VCol: [
      {
        key: 'cols',
        label: 'Cols',
        input: 'select',
        options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
      }
    ],
    VExpansionPanels: [
      {
        key: 'variant',
        label: 'Variant 1213',
        input: 'select',
        options: ['default', 'accordion', 'inset', 'popout']
      },
      { key: 'multiple', label: 'Multiple', input: 'switch' },
      { key: 'flat', label: 'Flat', input: 'switch' }
    ],
    VExpansionPanel: [
      { key: 'title', label: 'Title', input: 'text' },
      { key: 'value', label: 'Value', input: 'text' },
      { key: 'eager', label: 'Eager render', input: 'switch' }
    ]
  };
  return { schema };
}
