<script setup lang="ts" generic="Token extends string">
/** Theme presets of one setting, like the theme colours of a colour field. Picking the chosen one again clears it. */
const props = defineProps<{
  tokens: Token[]
  selected: Token | null
  /** What the presets set, for screen readers and tooltips. */
  label: string
}>()
const emit = defineEmits<{ pick: [token: Token | null] }>()
const pick = (token: Token) => emit('pick', props.selected === token ? null : token)
</script>

<template>
  <div class="token-chips" role="group" :aria-label="`${label}: theme presets`">
    <button
      v-for="token in tokens"
      :key="token"
      type="button"
      class="token-chip"
      :class="{ 'token-chip--on': selected === token }"
      :title="`Theme ${label.toLowerCase()}: ${token}`"
      :aria-label="`${label}: ${token}`"
      :aria-pressed="selected === token"
      @click="pick(token)"
    >
      {{ token }}
    </button>
  </div>
</template>

<style scoped>
.token-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}
.token-chip {
  padding: 2px 8px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  font-size: 12px;
  text-transform: uppercase;
}
.token-chip--on {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
}
</style>
