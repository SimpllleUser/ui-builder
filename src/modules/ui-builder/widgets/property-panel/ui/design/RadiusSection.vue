<script setup lang="ts">
import { computed, ref } from 'vue'
import { Corner, cornerProperty } from '../../model/designStyle'
import { parsePx, toPx } from '../../../../../../shared/lib/inlineStyle'
import { parseRadiusToken, RadiusToken, radiusValue } from '../../../../../../shared/lib/themeTokens'
import { useNodeStyle } from '../../model/useNodeStyle'
import { type UiNode } from '../../../../entities/ui-node'
import DesignSection from './DesignSection.vue'
import IconToggle from './IconToggle.vue'
import NumberField from './NumberField.vue'
import TokenChips from './TokenChips.vue'
import './designGrid.css'

const PRESETS = [0, 4, 8, 16, 9999]
const RADIUS_TOKENS = Object.values(RadiusToken)
const MAX_RADIUS = 9999
const CORNERS = [
  { corner: Corner.TopLeft, label: '◜', title: 'Top left corner' },
  { corner: Corner.TopRight, label: '◝', title: 'Top right corner' },
  { corner: Corner.BottomLeft, label: '◟', title: 'Bottom left corner' },
  { corner: Corner.BottomRight, label: '◞', title: 'Bottom right corner' },
]
const CLEAR_CORNERS = Object.fromEntries(Object.values(Corner).map(corner => [cornerProperty(corner), null]))

/** How round the corners are: one value for all, or a value for each corner. */
const props = defineProps<{ node: UiNode }>()
const { style, apply } = useNodeStyle(() => props.node)

const radius = computed(() => parsePx(style.value.borderRadius))
const hasCornerValues = computed(() => Object.values(Corner).some(corner => style.value[cornerProperty(corner)]))
const perCorner = ref(hasCornerValues.value)

const setAll = (value: number | null) => apply({ borderRadius: toPx(value), ...CLEAR_CORNERS })
const token = computed(() => parseRadiusToken(style.value.borderRadius))
const setToken = (next: RadiusToken | null) => apply({ borderRadius: next && radiusValue(next), ...CLEAR_CORNERS })
const setCorner = (corner: Corner, value: number | null) => {
  // Switching to separate corners starts from the common value, so nothing jumps.
  const base = Object.fromEntries(Object.values(Corner).map(item => [cornerProperty(item), toPx(radius.value)]))
  apply({ borderRadius: null, ...(hasCornerValues.value ? {} : base), [cornerProperty(corner)]: toPx(value) })
}
const cornerValue = (corner: Corner) => parsePx(style.value[cornerProperty(corner)]) ?? radius.value
</script>

<template>
  <DesignSection title="Corner radius">
    <div class="radius-row">
      <NumberField
        label="R"
        title="Corner radius"
        :model-value="radius"
        :min="0"
        :max="MAX_RADIUS"
        :placeholder="token ?? '0'"
        @update:model-value="setAll"
      />
      <IconToggle
        icon="mdi-border-radius"
        label="Set each corner separately"
        :pressed="perCorner"
        @click="perCorner = !perCorner"
      />
    </div>
    <div class="radius-presets" role="group" aria-label="Radius presets">
      <button
        v-for="preset in PRESETS"
        :key="preset"
        type="button"
        class="radius-preset"
        :class="{ 'radius-preset--on': radius === preset }"
        @click="setAll(preset)"
      >
        {{ preset === MAX_RADIUS ? 'Pill' : preset }}
      </button>
    </div>
    <TokenChips label="Radius" :tokens="RADIUS_TOKENS" :selected="token" @pick="setToken" />
    <div v-if="perCorner" class="design-grid">
      <NumberField
        v-for="item in CORNERS"
        :key="item.corner"
        :label="item.label"
        :title="item.title"
        :model-value="cornerValue(item.corner)"
        :min="0"
        :max="MAX_RADIUS"
        placeholder="0"
        @update:model-value="value => setCorner(item.corner, value)"
      />
    </div>
  </DesignSection>
</template>

<style scoped>
.radius-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
}
.radius-presets {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}
.radius-preset {
  padding: 2px 8px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  font-size: 12px;
}
.radius-preset--on {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
}
</style>
