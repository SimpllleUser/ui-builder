<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useUiTreeStore } from '../../../entities/ui-node'

/** The message a “show a message” action puts at the bottom of Preview, for a few seconds. */
const store = useUiTreeStore()
const VISIBLE_MS = 4000

const text = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
watch(
  () => store.previewMessage,
  message => {
    clearTimeout(timer)
    text.value = message?.text ?? ''
    timer = setTimeout(() => (text.value = ''), VISIBLE_MS)
  },
  { immediate: true },
)
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div v-if="text" class="preview-message" role="status">{{ text }}</div>
</template>

<style>
.preview-message {
  position: fixed;
  z-index: 3000;
  bottom: 16px;
  left: 50%;
  max-width: calc(100% - 32px);
  padding: 12px 16px;
  border-radius: 6px;
  background: rgb(var(--v-theme-on-surface));
  color: rgb(var(--v-theme-surface));
  font-size: 14px;
  transform: translateX(-50%);
}
</style>
