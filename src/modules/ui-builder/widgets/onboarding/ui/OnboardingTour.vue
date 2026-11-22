<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useUiTreeStore } from '../../../entities/ui-node/model/store'
import { TOUR_STEPS, stepAfterProgress } from '../model/tourSteps'

/**
 * Three short hints for a first visit. They point at the real controls, move on by themselves as the person
 * does what each one asks, and can be skipped at any time.
 */
const props = defineProps<{ modelValue: boolean; suspended?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [open: boolean]; finish: [] }>()
const store = useUiTreeStore()

const CARD_WIDTH = 320
const GAP = 12
const step = ref(0)
const target = ref<{ top: number; left: number; width: number; height: number } | null>(null)
const card = ref<HTMLElement>()
const cardPosition = ref({ top: 0, left: 0 })

const current = computed(() => TOUR_STEPS[step.value])
const isLast = computed(() => step.value === TOUR_STEPS.length - 1)

const finish = () => {
  emit('update:modelValue', false)
  emit('finish')
}
const next = () => (isLast.value ? finish() : step.value++)

// Adding something selects it by itself, so “select an element” counts only when the person clicks one.
const clickedElement = ref(false)
const onClick = (event: MouseEvent) => {
  const hit = (event.target as HTMLElement | null)?.closest('[data-node-id], [data-tree-id]')
  if (hit && step.value >= 1 && !hit.closest('.tour')) clickedElement.value = true
}

// Moves on by itself when the action of the current step has been done.
const progress = computed(() => ({
  hasContent: store.rootNode.children.length > 0,
  hasSelection: clickedElement.value,
  previewing: store.isPreviewMode,
}))
watch(
  progress,
  value => {
    if (!props.modelValue) return
    const after = stepAfterProgress(step.value, value)
    if (after === null) finish()
    else step.value = after
  },
  { deep: true },
)
watch(
  () => props.modelValue,
  open => {
    if (!open) return
    step.value = 0
    clickedElement.value = false
  },
)

const locate = () => {
  const element = current.value.targets
    .map(selector => document.querySelector<HTMLElement>(selector))
    .find(found => found && found.offsetParent !== null)
  if (!element) {
    target.value = null
    cardPosition.value = { top: window.innerHeight - 220, left: Math.max(GAP, window.innerWidth / 2 - CARD_WIDTH / 2) }
    return
  }
  const rect = element.getBoundingClientRect()
  target.value = { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
  const height = card.value?.offsetHeight ?? 160
  const below = rect.bottom + GAP
  // Below the target when it fits, otherwise above it, otherwise inside it near the top.
  const top =
    below + height < window.innerHeight
      ? below
      : rect.top - height - GAP > 0
        ? rect.top - height - GAP
        : Math.max(GAP, rect.top + GAP)
  const left = Math.min(
    Math.max(GAP, rect.left + rect.width / 2 - CARD_WIDTH / 2),
    window.innerWidth - CARD_WIDTH - GAP,
  )
  cardPosition.value = { top, left }
}

// Layout shifts as panels open and the page fills up, so follow the target for as long as the tour is open.
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  locate()
  timer = setInterval(locate, 300)
  window.addEventListener('resize', locate)
  document.addEventListener('click', onClick, true)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  window.removeEventListener('resize', locate)
  document.removeEventListener('click', onClick, true)
})
watch(step, () => requestAnimationFrame(locate))
</script>

<template>
  <div v-if="modelValue && !suspended" class="tour" aria-live="polite">
    <div
      v-if="target"
      class="tour__ring"
      aria-hidden="true"
      :style="{
        top: `${target.top - 4}px`,
        left: `${target.left - 4}px`,
        width: `${target.width + 8}px`,
        height: `${target.height + 8}px`,
      }"
    />
    <section
      ref="card"
      class="tour__card"
      role="dialog"
      aria-label="Quick tour"
      :style="{ top: `${cardPosition.top}px`, left: `${cardPosition.left}px`, width: `${CARD_WIDTH}px` }"
    >
      <div class="tour__step">Step {{ step + 1 }} of {{ TOUR_STEPS.length }}</div>
      <h2 class="tour__title">{{ current.title }}</h2>
      <p class="tour__text">{{ current.text }}</p>
      <div class="tour__actions">
        <VBtn size="small" variant="text" @click="finish">Skip tour</VBtn>
        <VSpacer />
        <VBtn size="small" color="primary" variant="flat" @click="next">{{ isLast ? 'Got it' : 'Next' }}</VBtn>
      </div>
    </section>
  </div>
</template>

<style scoped>
.tour__ring {
  position: fixed;
  z-index: 2400;
  border: 2px solid rgb(var(--v-theme-primary));
  border-radius: 8px;
  box-shadow: 0 0 0 4px rgba(var(--v-theme-primary), 0.2);
  pointer-events: none;
  transition:
    top 0.2s,
    left 0.2s,
    width 0.2s,
    height 0.2s;
}
.tour__card {
  position: fixed;
  z-index: 2401;
  padding: 14px 16px 10px;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(var(--v-border-color), 0.2);
}
.tour__step {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}
.tour__title {
  margin: 4px 0 6px;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
}
.tour__text {
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.5;
}
.tour__actions {
  display: flex;
  align-items: center;
}
</style>
