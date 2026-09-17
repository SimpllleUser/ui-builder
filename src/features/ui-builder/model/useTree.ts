import type { PaletteItem } from '../types';

export function useTree() {
  const findById = (list: PaletteItem[], id: number | null): PaletteItem | null => {
    if (id == null) return null;
    for (const n of list) {
      if (n.id === id) return n;
      if (n.children?.length) {
        const f = findById(n.children, id);
        if (f) return f;
      }
    }
    return null;
  };

  const removeById = (list: PaletteItem[], id: number): boolean => {
    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      if (n.id === id) {
        list.splice(i, 1);
        return true;
      }
      if (n.children?.length && removeById(n.children, id)) return true;
    }
    return false;
  };

  return { findById, removeById };
}
