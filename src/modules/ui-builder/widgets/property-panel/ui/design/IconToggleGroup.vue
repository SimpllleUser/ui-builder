<script setup lang="ts">
/** A row of icon toggles that belong together; screen readers announce it as one named group. */
defineProps<{ label: string }>()
</script>

<template>
  <div class="icon-toggle-group" role="group" :aria-label="label">
    <slot />
  </div>
</template>

<style scoped>
.icon-toggle-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
}
</style>
