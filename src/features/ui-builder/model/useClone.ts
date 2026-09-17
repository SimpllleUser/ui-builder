import type { PaletteItem } from '../types';

export function useClone() {
  const clonePaletteItem = (orig: PaletteItem): PaletteItem => ({
    id: Date.now() + Math.floor(Math.random() * 1e6),
    type: orig.type,
    name: orig.name,
    props: JSON.parse(JSON.stringify(orig.props)),
    children: Array.isArray(orig.children) ? [] : undefined
  });
  return { clonePaletteItem };
}
