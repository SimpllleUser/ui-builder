<script setup lang="ts">
import { VueDraggableNext as Draggable } from 'vue-draggable-next';
import { useCanvas } from '../model/useCanvas';
import { useDnDGroups } from '../model/useDnDGroups';
import { useTree } from '../model/useTree';
import { useHistory } from '../model/useHistory';
import { useSelection } from '../model/useSelection';
import { useGroup } from '../model/useGroup';
import Node from './Node.vue';

const { canvas } = useCanvas();
const { groupCanvas } = useDnDGroups();
const { removeById } = useTree();
const { commit } = useHistory(canvas);
const { selectedIds, selectOne, toggle } = useSelection();
const { ungroupDivById } = useGroup(canvas);

const onDndChange = () => commit();
const onRemove = (id: number) => {
  removeById(canvas.value, id);
  commit();
};
const onClickNode = ({ id, meta }: { id: number; meta: boolean }) => {
  meta ? toggle(id) : selectOne(id);
};
const onUngroup = (id: number) => {
  ungroupDivById(id);
  commit();
};
</script>

<template>
  <Draggable
    v-model="canvas"
    item-key="id"
    :group="groupCanvas"
    class="list canvas"
    @change="onDndChange"
    @add="onDndChange"
    @remove="onDndChange"
  >
    <div
      v-if="!canvas.length"
      class="placeholder"
    >
      Перетягніть компонент із палітри →
    </div>
    <div
      v-for="comp in canvas"
      :key="comp.id"
      class="canvas-item"
    >
      <Node
        :node="comp"
        :selected-ids="selectedIds"
        @click-node="onClickNode"
        @remove="onRemove"
        @changed="onDndChange"
        @ungroup="onUngroup"
      />
    </div>
  </Draggable>
</template>
