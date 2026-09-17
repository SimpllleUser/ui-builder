import { ref } from 'vue';
import type { PaletteItem } from '../types';

const state = {
  canvas: ref<PaletteItem[]>([]),
  selectedId: ref<number | null>(null)
};

export function useCanvas() {
  return state;
}
