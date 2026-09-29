import type { PaletteItem } from '../types';

export type ParentLocation = { parent: PaletteItem[]; index: number };

export const findNode = (nodes: PaletteItem[], id: number | null): PaletteItem | null => {
  if (id == null) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

export const findParent = (nodes: PaletteItem[], id: number): ParentLocation | null => {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node.id === id) return { parent: nodes, index };
    if (node.children?.length) {
      const found = findParent(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

export const removeNode = (nodes: PaletteItem[], id: number): boolean => {
  const location = findParent(nodes, id);
  if (!location) return false;
  location.parent.splice(location.index, 1);
  return true;
};

export const groupNodes = (
  nodes: PaletteItem[],
  ids: readonly number[],
  createWrapper: (children: PaletteItem[]) => PaletteItem
): PaletteItem | null => {
  if (ids.length < 2) return null;

  const locations = ids.map(id => findParent(nodes, id));
  if (locations.some(location => !location)) return null;
  const parent = locations[0]!.parent;
  if (!locations.every(location => location!.parent === parent)) return null;

  const selectedIds = new Set(ids);
  const selectedIndexes = parent
    .map((node, index) => (selectedIds.has(node.id) ? index : -1))
    .filter(index => index >= 0);
  if (!selectedIndexes.length) return null;

  const insertIndex = Math.min(...selectedIndexes);
  const selected = parent.filter(node => selectedIds.has(node.id));
  const rest = parent.filter(node => !selectedIds.has(node.id));
  const beforeCount = insertIndex - selectedIndexes.filter(index => index < insertIndex).length;
  const wrapper = createWrapper(selected);
  parent.splice(0, parent.length, ...rest.slice(0, beforeCount), wrapper, ...rest.slice(beforeCount));
  return wrapper;
};

export const ungroupNode = (nodes: PaletteItem[], id: number): PaletteItem[] | null => {
  const location = findParent(nodes, id);
  if (!location) return null;
  const node = location.parent[location.index];
  if (node.name !== 'Div') return null;
  const children = node.children ?? [];
  location.parent.splice(location.index, 1, ...children);
  return children;
};
