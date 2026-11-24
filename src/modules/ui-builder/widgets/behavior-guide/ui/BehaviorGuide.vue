<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { GUIDE_SECTIONS, GuideSection, isGuideSection } from '../model/guideContent'
import GuideBlockView from './GuideBlockView.vue'

const open = defineModel<boolean>({ required: true })

const current = defineModel<GuideSection>('section', { default: GuideSection.Overview })
const index = computed(() => GUIDE_SECTIONS.findIndex(section => section.id === current.value))
const section = computed(() => GUIDE_SECTIONS[index.value])
const previous = computed(() => GUIDE_SECTIONS[index.value - 1])
const next = computed(() => GUIDE_SECTIONS[index.value + 1])

const selectSection = (ids: unknown[]) => {
  const [chosen] = ids
  if (isGuideSection(chosen)) current.value = chosen
}

const content = ref<HTMLElement>()
// A new section starts at its top instead of keeping the scroll position of the previous one.
watch(current, () => content.value?.scrollTo({ top: 0 }))
</script>

<template>
  <VDialog v-model="open" fullscreen scrollable transition="dialog-bottom-transition">
    <VCard class="guide" aria-label="Behavior guide">
      <VToolbar density="comfortable" class="guide__bar">
        <VToolbarTitle>Behavior guide</VToolbarTitle>
        <VBtn icon="mdi-close" aria-label="Close the guide" @click="open = false" />
      </VToolbar>
      <div class="guide__body">
        <VList class="guide__nav" density="compact" nav :selected="[current]" @update:selected="selectSection">
          <VListItem
            v-for="entry in GUIDE_SECTIONS"
            :key="entry.id"
            :value="entry.id"
            :title="entry.title"
            :prepend-icon="entry.icon"
          />
        </VList>
        <main ref="content" class="guide__content">
          <article class="guide__article">
            <h1 class="text-h5">{{ section.title }}</h1>
            <GuideBlockView v-for="(block, position) in section.blocks" :key="position" :block="block" />
            <div class="guide__pager">
              <VBtn v-if="previous" variant="text" prepend-icon="mdi-arrow-left" @click="current = previous.id">
                {{ previous.title }}
              </VBtn>
              <VSpacer />
              <VBtn
                v-if="next"
                variant="tonal"
                color="primary"
                append-icon="mdi-arrow-right"
                @click="current = next.id"
              >
                {{ next.title }}
              </VBtn>
            </div>
          </article>
        </main>
      </div>
    </VCard>
  </VDialog>
</template>

<style>
.guide-code {
  margin: 0;
  padding: 10px 12px;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  white-space: pre-wrap;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
</style>

<style scoped>
.guide {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.guide__bar {
  flex: 0 0 auto;
}
.guide__body {
  display: flex;
  flex: 1;
  min-height: 0;
}
.guide__nav {
  flex: 0 0 240px;
  overflow-y: auto;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.guide__content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
.guide__article {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 820px;
  margin: 0 auto;
}
.guide__pager {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
@media (max-width: 720px) {
  .guide__body {
    flex-direction: column;
  }
  .guide__nav {
    flex: 0 0 auto;
    max-height: 30%;
    border-right: 0;
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
}
</style>
