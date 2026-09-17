import type { PaletteItem, CompName } from '../types';
import { REGISTRY } from './registry';

export type NodeSnap = {
  id: number;
  name: CompName;
  props: Record<string, any>;
  children?: NodeSnap[];
};

export const toSnapshot = (nodes: PaletteItem[]): NodeSnap[] =>
  nodes.map(n => ({
    id: n.id,
    name: n.name,
    props: JSON.parse(JSON.stringify(n.props || {})),
    children: n.children?.length ? toSnapshot(n.children) : undefined
  }));

export const fromSnapshot = (snaps: NodeSnap[]): PaletteItem[] =>
  snaps.map(s => ({
    id: s.id,
    name: s.name,
    type: REGISTRY[s.name],
    props: s.props || {},
    children: s.children?.length ? fromSnapshot(s.children) : []
  }));
