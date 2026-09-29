import type { NodeProps, PaletteItem, CompName } from '../types';
import { REGISTRY } from './registry';

export type NodeSnap = {
  id: number;
  name: CompName;
  props: NodeProps;
  children?: NodeSnap[];
};

const cloneProps = (props: NodeProps | undefined): NodeProps => {
  if (!props) return {};
  return JSON.parse(JSON.stringify(props)) as NodeProps;
};

export const toSnapshot = (nodes: PaletteItem[]): NodeSnap[] =>
  nodes.map(n => ({
    id: n.id,
    name: n.name,
    props: cloneProps(n.props),
    children: n.children?.length ? toSnapshot(n.children) : undefined
  }));

export const fromSnapshot = (snaps: NodeSnap[]): PaletteItem[] =>
  snaps.map(s => ({
    id: s.id,
    name: s.name,
    type: REGISTRY[s.name],
    props: cloneProps(s.props),
    children: s.children?.length ? fromSnapshot(s.children) : []
  }));
