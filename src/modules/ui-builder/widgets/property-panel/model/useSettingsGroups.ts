import {
  FieldKind,
  getComponentDef,
  type PropField,
  type PropertySection,
  type UiNode,
} from '../../../entities/ui-node'
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useStorage } from '@vueuse/core'

/** Components with this many settings or more get a search box. */
const SEARCH_MIN_SETTINGS = 8

/**
 * Settings shown in groups that can be folded, and searched across all tabs.
 * Groups the component marks as rarely needed start folded; a group the person opened or closed keeps that choice.
 */
export function useSettingsGroups(node: Ref<UiNode | null>, tabSections: ComputedRef<PropertySection[]>) {
  const sectionState = useStorage<Record<string, boolean>>('ui-builder:section-state', {})
  const searchText = ref('')

  const allSections = computed<PropertySection[]>(() =>
    (node.value ? (getComponentDef(node.value.type)?.propertySections ?? []) : []).map(section => ({
      ...section,
      fields: section.fields.filter(field => field.kind !== FieldKind.CustomClasses),
    })),
  )
  const searchable = computed(
    () => allSections.value.reduce((count, section) => count + section.fields.length, 0) >= SEARCH_MIN_SETTINGS,
  )
  /** The words being searched for, empty when there is nothing to search. */
  const query = computed(() => (searchable.value ? (searchText.value ?? '').trim().toLowerCase() : ''))

  const matches = (field: PropField) =>
    ['label' in field ? field.label : undefined, 'prop' in field ? field.prop : undefined].some(text =>
      text?.toLowerCase().includes(query.value),
    )
  const searchResults = computed(() =>
    allSections.value
      .map(section => ({
        ...section,
        // A group whose name matches shows all of its settings.
        fields: section.title?.toLowerCase().includes(query.value) ? section.fields : section.fields.filter(matches),
      }))
      .filter(section => section.fields.length),
  )
  /** Search results while searching, otherwise the groups of the open tab. */
  const visibleSections = computed(() => (query.value ? searchResults.value : tabSections.value))

  const keyOf = (section: PropertySection) => `${node.value?.type}:${section.title}`
  const isOpen = (section: PropertySection) => {
    if (query.value || !section.title) return true
    return sectionState.value[keyOf(section)] ?? !section.collapsed
  }
  const toggle = (section: PropertySection) => {
    sectionState.value = { ...sectionState.value, [keyOf(section)]: !isOpen(section) }
  }
  const clearSearch = () => (searchText.value = '')

  return { searchText, searchable, query, visibleSections, isOpen, toggle, clearSearch }
}
