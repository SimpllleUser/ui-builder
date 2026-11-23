<script setup lang="ts">
/** A small icon button that is either on or off, used across the design controls. */
withDefaults(defineProps<{ icon: string; label: string; pressed: boolean; title?: string; compact?: boolean }>(), {
  title: undefined,
  compact: false,
})
</script>

<template>
  <button
    type="button"
    class="icon-toggle"
    :class="{ 'icon-toggle--on': pressed, 'icon-toggle--compact': compact }"
    :title="title ?? label"
    :aria-label="label"
    :aria-pressed="pressed"
  >
    <VIcon :icon="icon" :size="compact ? 14 : 16" aria-hidden="true" />
  </button>
</template>

<style scoped>
.icon-toggle {
  display: grid;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 6px;
  opacity: 0.6;
}
.icon-toggle--compact {
  width: 22px;
  height: 22px;
  border-radius: 4px;
}
.icon-toggle:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.icon-toggle--on {
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
  opacity: 1;
}
</style>
