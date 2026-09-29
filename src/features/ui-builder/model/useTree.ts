import type { PaletteItem } from '../types';
import { findNode, removeNode } from './treeOperations';

export function useTree() {
  return { findById: findNode, removeById: removeNode };
}
