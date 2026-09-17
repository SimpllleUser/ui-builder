import { ref, watch, computed, type Ref } from 'vue';
import type { PaletteItem } from '../types';
import { toSnapshot, fromSnapshot } from './snapshot';

export function useHistory(canvas: Ref<PaletteItem[]>) {
  const past = ref<string[]>([]);
  const future = ref<string[]>([]);
  const isApplying = ref(false);
  const MAX = 100;

  const serialize = () => JSON.stringify(toSnapshot(canvas.value));
  const restore = (snap: string) => fromSnapshot(JSON.parse(snap));

  const push = () => {
    if (isApplying.value) return;
    const snap = serialize();
    if (!past.value.length || past.value[past.value.length - 1] !== snap) {
      past.value.push(snap);
      if (past.value.length > MAX) past.value.shift();
      future.value = [];
    }
  };

  if (!past.value.length) past.value.push(serialize());

  let t: any;
  watch(
    canvas,
    () => {
      clearTimeout(t);
      t = setTimeout(push, 250);
    },
    { deep: true }
  );

  const undo = () => {
    if (past.value.length <= 1) return;
    const current = past.value.pop()!;
    future.value.push(current);
    const prev = past.value[past.value.length - 1];
    isApplying.value = true;
    canvas.value = restore(prev);
    isApplying.value = false;
  };

  const redo = () => {
    if (!future.value.length) return;
    const next = future.value.pop()!;
    past.value.push(next);
    isApplying.value = true;
    canvas.value = restore(next);
    isApplying.value = false;
  };

  const canUndo = computed(() => past.value.length > 1);
  const canRedo = computed(() => future.value.length > 0);
  const commit = () => push();

  return { undo, redo, canUndo, canRedo, commit };
}
