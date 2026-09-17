import { ref, computed } from 'vue';

const selectedId = ref<number | null>(null);
const selectedIds = ref<number[]>([]);

const isSelected = (id: number) => selectedIds.value.includes(id);

const selectOne = (id: number) => {
  selectedIds.value = [id];
  selectedId.value = id;
};

const toggle = (id: number) => {
  if (isSelected(id)) {
    selectedIds.value = selectedIds.value.filter(x => x !== id);
    selectedId.value = selectedIds.value[selectedIds.value.length - 1] ?? null;
  } else {
    selectedIds.value = [...selectedIds.value, id];
    selectedId.value = id;
  }
};

const clear = () => {
  selectedIds.value = [];
  selectedId.value = null;
};

const count = computed(() => selectedIds.value.length);

export function useSelection() {
  return { selectedId, selectedIds, isSelected, selectOne, toggle, clear, count };
}
