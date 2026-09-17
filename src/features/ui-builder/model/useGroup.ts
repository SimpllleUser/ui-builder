import type { Ref } from 'vue';
import type { PaletteItem } from '../types';
import { REGISTRY } from './registry';
import { useSelection } from './useSelection';

const genId = () => Date.now() + Math.floor(Math.random() * 1e6);

type ParentLoc = { parent: PaletteItem[]; index: number } | null;

function findParent(list: PaletteItem[], id: number): ParentLoc {
  for (let i = 0; i < list.length; i++) {
    const n = list[i];
    if (n.id === id) return { parent: list, index: i };
    if (n.children?.length) {
      const r = findParent(n.children, id);
      if (r) return r;
    }
  }
  return null;
}

function findNode(list: PaletteItem[], id: number): PaletteItem | null {
  for (const n of list) {
    if (n.id === id) return n;
    if (n.children?.length) {
      const r = findNode(n.children, id);
      if (r) return r;
    }
  }
  return null;
}

export function useGroup(canvas: Ref<PaletteItem[]>) {
  const { selectedIds, selectedId, selectOne } = useSelection();

  const canGroup = (): boolean => {
    if (selectedIds.value.length < 2) return false;
    const locs = selectedIds.value.map(id => findParent(canvas.value, id)).filter(Boolean) as ParentLoc[];
    if (!locs.length) return false;
    const firstParent = locs[0]!.parent;
    return locs.every(l => l!.parent === firstParent);
  };

  const groupIntoDiv = () => {
    if (!canGroup()) return;
    const ids = selectedIds.value.slice();
    const locs = ids.map(id => findParent(canvas.value, id)) as ParentLoc[];
    const parent = locs[0]!.parent;

    const indices = parent.map((n, i) => (ids.includes(n.id) ? i : -1)).filter(i => i >= 0);
    const insertIndex = Math.min(...indices);

    const nodes = parent.filter(n => ids.includes(n.id));
    const rest = parent.filter(n => !ids.includes(n.id));
    const before = rest.slice(0, insertIndex - indices.filter(i => i < insertIndex).length);
    const after = rest.slice(before.length);

    const wrapper: PaletteItem = {
      id: genId(),
      name: 'Div',
      type: REGISTRY.Div,
      props: { class: '' },
      children: nodes
    };

    parent.splice(0, parent.length, ...before, wrapper, ...after);
    selectOne(wrapper.id);
  };

  const canUngroup = (id?: number): boolean => {
    const targetId = id ?? selectedId.value ?? null;
    if (!targetId) return false;
    const node = findNode(canvas.value, targetId);
    return !!node && node.name === 'Div';
  };

  const ungroupDivById = (id: number) => {
    const loc = findParent(canvas.value, id);
    if (!loc) return;
    const { parent, index } = loc;
    const node = parent[index];
    const children = node.children ?? [];
    parent.splice(index, 1, ...children);
    // вибираємо останню дитину або скидаємо вибір
    selectOne(children[children.length - 1]?.id ?? (null as any));
  };

  const ungroupDiv = () => {
    const targetId = selectedId.value ?? null;
    if (!targetId) return;
    if (!canUngroup(targetId)) return;
    ungroupDivById(targetId);
  };

  return { canGroup, groupIntoDiv, canUngroup, ungroupDiv, ungroupDivById };
}
