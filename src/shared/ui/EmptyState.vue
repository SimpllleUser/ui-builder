<script setup lang="ts">
/** What a place shows when there is nothing in it yet: what it is for, what to do, and optionally the first action. */
defineProps<{ icon: string; title: string; description?: string }>()
</script>

<template>
  <div class="empty-state">
    <VIcon :icon="icon" size="32" class="empty-state__icon" aria-hidden="true" />
    <p class="empty-state__title text-subtitle-2">{{ title }}</p>
    <p v-if="description" class="empty-state__description text-body-2 text-medium-emphasis">{{ description }}</p>
    <div v-if="$slots.default" class="empty-state__actions"><slot /></div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px 12px;
  text-align: center;
}
.empty-state__icon {
  color: rgb(var(--v-theme-primary));
  opacity: 0.6;
}
.empty-state__title,
.empty-state__description {
  margin: 0;
  max-width: 280px;
}
.empty-state__actions {
  width: 100%;
  margin-top: 8px;
}
</style>
