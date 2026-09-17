<script setup lang="ts">
import { Icons } from '../../../shared/icons'
import '../styles.scss';
import { computed, onMounted, onBeforeUnmount } from 'vue';
import Palette from './Palette.vue';
import Canvas from './Canvas.vue';
import { useCanvas } from '../model/useCanvas';
import { useTree } from '../model/useTree';
import { useSchema } from '../model/useSchema';
import { useHistory } from '../model/useHistory';
import { useSelection } from '../model/useSelection';
import { useGroup } from '../model/useGroup';

const { canvas } = useCanvas();
const { findById } = useTree();
const { schema } = useSchema();
const { undo, redo, canUndo, canRedo, commit } = useHistory(canvas);
const { selectedId, selectedIds } = useSelection();
const { canGroup, groupIntoDiv, canUngroup, ungroupDiv } = useGroup(canvas);

const selectedComp = computed(() => findById(canvas.value, selectedId.value));

const onKey = (e: KeyboardEvent) => {
  const mod = e.metaKey || e.ctrlKey;
  if (!mod) return;
  const key = e.key.toLowerCase();
  if (key === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if ((key === 'z' && e.shiftKey) || key === 'y') {
    e.preventDefault();
    redo();
  }
};

const closeDrawer = () => {
  selectedId.value = null;
};

let t: number | undefined;
const commitSoon = () => {
  if (t) clearTimeout(t);
  t = window.setTimeout(() => commit(), 150);
};

const onGroup = () => {
  groupIntoDiv();
  commit();
};
const onUngroup = () => {
  ungroupDiv();
  commit();
};

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <VRow
    class="wrapper"
    no-gutters
  >
    <VCol cols="3">
      <Palette />
    </VCol>

    <VCol cols="9">
      <div class="d-flex align-center justify-space-between mb-2">
        <h3 class="ma-0">🖌️ Canvas</h3>
        <div class="d-flex align-center">
          <VBtn
            class="mr-2"
            :prepend-icon="Icons.Select"
            variant="tonal"
            :disabled="selectedIds.length === 0"
          >
            {{ selectedIds.length }} selected
          </VBtn>

          <VBtn
            class="mr-2"
            :prepend-icon="Icons.FolderMultipleOutline"
            variant="tonal"
            :disabled="!canGroup()"
            @click="onGroup"
          >
            Group in Div
          </VBtn>

          <VBtn
            class="mr-4"
            :prepend-icon="Icons.Ungroup"
            variant="tonal"
            :disabled="!canUngroup()"
            @click="onUngroup"
          >
            Ungroup
          </VBtn>

          <VBtn
            :icon="Icons.Undo"
            variant="tonal"
            class="mr-2"
            :disabled="!canUndo"
            @click="undo"
          />
          <VBtn
            :icon="Icons.Redo"
            variant="tonal"
            :disabled="!canRedo"
            @click="redo"
          />
        </div>
      </div>

      <Canvas />
    </VCol>
  </VRow>

  <VNavigationDrawer
    :model-value="!!selectedComp"
    location="bottom"
    temporary
    width="420"
    :scrim="false"
    :touchless="true"
    @update:model-value="
      val => {
        if (!val) closeDrawer();
      }
    "
  >
    <div class="panel">
      <div class="d-flex align-center justify-space-between mb-3">
        <h3 class="ma-0">⚙️ Властивості</h3>
        <VBtn
          size="small"
          variant="text"
          :icon="Icons.Close"
          @click="closeDrawer"
        />
      </div>

      <div
        v-if="!selectedComp"
        class="placeholder"
      >
        Виберіть компонент на Canvas
      </div>

      <template v-else>
        <div class="prop-line">
          <strong>{{ selectedComp.name }}</strong>
        </div>

        <div
          v-for="field in schema[selectedComp.name]"
          :key="field.key"
          class="prop-line"
        >
          <label class="prop-label">{{ field.label }}</label>

          <input
            v-if="field.input === 'text'"
            v-model="selectedComp.props[field.key]"
            type="text"
            class="prop-input"
            @input="commitSoon"
            @change="commitSoon"
          />

          <select
            v-else-if="field.input === 'select'"
            v-model="selectedComp.props[field.key]"
            class="prop-input"
            @input="commitSoon"
            @change="commitSoon"
          >
            <option
              v-for="opt in field.options"
              :key="opt"
              :value="opt"
            >
              {{ opt }}
            </option>
          </select>

          <input
            v-else-if="field.input === 'switch'"
            v-model="selectedComp.props[field.key]"
            type="checkbox"
            @change="commitSoon"
          />
        </div>
      </template>
    </div>
  </VNavigationDrawer>
</template>
