import { ref } from 'vue';
import type { Ref } from 'vue';
import type { PaletteItem } from '../types';

type CanvasState = {
  canvas: Ref<PaletteItem[]>;
  selectedId: Ref<number | null>;
};

const state: CanvasState = {
  canvas: ref<PaletteItem[]>([]),
  selectedId: ref<number | null>(null)
};

export function useCanvas(): CanvasState {
  return state;
}
