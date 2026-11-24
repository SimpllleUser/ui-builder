<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <section class="setting-section">
    <h3 class="setting-section__title text-subtitle-2">{{ title }}</h3>
    <slot />
  </section>
</template>

<style scoped>
.setting-section__title {
  margin-bottom: 8px;
}
</style>
