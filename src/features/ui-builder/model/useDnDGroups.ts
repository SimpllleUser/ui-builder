export const groupPalette = { name: 'vuetify', pull: 'clone', put: false } as const;
export const groupCanvas = { name: 'vuetify', pull: true, put: true } as const;

export function useDnDGroups() {
  return { groupPalette, groupCanvas };
}
