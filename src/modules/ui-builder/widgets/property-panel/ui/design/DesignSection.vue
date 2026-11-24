<script setup lang="ts">
/** A titled block of the Design tab. */
defineProps<{ title: string }>()
</script>

<template>
  <section class="design-section">
    <h3 class="design-section__title">{{ title }}</h3>
    <slot />
  </section>
</template>

<style scoped>
.design-section {
  padding-block: 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.15);
}
.design-section__title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.7;
}
</style>
