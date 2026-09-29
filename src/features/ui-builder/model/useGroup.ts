import type { Ref } from 'vue';
import type { PaletteItem } from '../types';
import { REGISTRY } from './registry';
import { findNode, findParent, groupNodes, ungroupNode, type ParentLocation } from './treeOperations';
import { useSelection } from './useSelection';

const genId = () => Date.now() + Math.floor(Math.random() * 1e6);

export function useGroup(canvas: Ref<PaletteItem[]>) {
  const { selectedIds, selectedId, selectOne, clear } = useSelection();

  const canGroup = (): boolean => {
    if (selectedIds.value.length < 2) return false;
    const locs = selectedIds.value.map(id => findParent(canvas.value, id)).filter(Boolean) as ParentLocation[];
    if (!locs.length) return false;
    const firstParent = locs[0]!.parent;
    return locs.every(l => l!.parent === firstParent);
  };

  const groupIntoDiv = () => {
    if (!canGroup()) return;
    const wrapper = groupNodes(canvas.value, selectedIds.value, children => ({
      id: genId(),
      name: 'Div',
      type: REGISTRY.Div,
      props: { class: '' },
      children
    }));
    if (wrapper) selectOne(wrapper.id);
  };

  const canUngroup = (id?: number): boolean => {
    const targetId = id ?? selectedId.value ?? null;
    if (!targetId) return false;
    const node = findNode(canvas.value, targetId);
    return !!node && node.name === 'Div';
  };

  const ungroupDivById = (id: number) => {
    const children = ungroupNode(canvas.value, id);
    if (!children) return;
    // вибираємо останню дитину або скидаємо вибір
    const lastChildId = children[children.length - 1]?.id;
    if (lastChildId === undefined) clear();
    else selectOne(lastChildId);
  };

  const ungroupDiv = () => {
    const targetId = selectedId.value ?? null;
    if (!targetId) return;
    if (!canUngroup(targetId)) return;
    ungroupDivById(targetId);
  };

  return { canGroup, groupIntoDiv, canUngroup, ungroupDiv, ungroupDivById };
}
