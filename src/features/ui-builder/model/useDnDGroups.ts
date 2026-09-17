export function useDnDGroups() {
  const groupPalette = { name: 'vuetify', pull: 'clone', put: false };
  const groupCanvas = { name: 'vuetify', pull: true, put: true };
  return { groupPalette, groupCanvas };
}
