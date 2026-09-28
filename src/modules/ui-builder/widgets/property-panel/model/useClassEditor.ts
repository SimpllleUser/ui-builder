import { computed, ref, type ComputedRef } from 'vue'
import type { UiNode } from '../../../entities/ui-node/model/types'

type ClassGroup = { title: string; classes: string[] }

const CLASS_GROUPS: ClassGroup[] = [
  { title: 'Elevation', classes: [0,1,2,3,4,6,8,12,16,24].map(n => `elevation-${n}`) },
  { title: 'Rounded', classes: ['rounded-0','rounded-sm','rounded','rounded-lg','rounded-xl','rounded-pill','rounded-circle'] },
  { title: 'Sizing', classes: ['w-25','w-50','w-75','w-100','w-auto','h-25','h-50','h-75','h-100','h-auto','fill-height','min-width-0','max-width-100'] },
  { title: 'Display', classes: ['d-none','d-block','d-inline','d-inline-block','d-flex','d-inline-flex','d-grid'] },
  { title: 'Flexbox', classes: ['flex-row','flex-column','flex-row-reverse','flex-column-reverse','flex-wrap','flex-nowrap','flex-grow-1','flex-shrink-0','align-start','align-center','align-end','align-stretch','align-self-center','justify-start','justify-center','justify-end','justify-space-between','justify-space-around',...[1,2,3,4,6,8,12].map(n=>`ga-${n}`)] },
  { title: 'Position', classes: ['position-relative','position-absolute','position-fixed','position-sticky'] },
  { title: 'Overflow', classes: ['overflow-hidden','overflow-visible','overflow-auto','overflow-x-hidden','overflow-y-auto','overflow-y-hidden'] },
  { title: 'Text Size', classes: ['text-caption','text-body-2','text-body-1','text-subtitle-2','text-subtitle-1','text-h6','text-h5','text-h4','text-h3'] },
  { title: 'Text Weight', classes: ['font-weight-thin','font-weight-light','font-weight-regular','font-weight-medium','font-weight-bold','font-weight-black'] },
  { title: 'Text Style', classes: ['text-left','text-center','text-right','text-uppercase','text-lowercase','text-capitalize','text-truncate','text-no-wrap','text-break','text-italic'] },
  { title: 'Text Color', classes: ['text-primary','text-secondary','text-success','text-info','text-warning','text-error','text-white','text-black','text-disabled','text-medium-emphasis','text-high-emphasis'] },
  { title: 'Background', classes: ['bg-primary','bg-secondary','bg-success','bg-info','bg-warning','bg-error','bg-white','bg-black','bg-surface','bg-background','bg-grey-lighten-5','bg-grey-lighten-4','bg-grey-lighten-3','bg-grey-darken-1','bg-grey-darken-2'] },
  { title: 'Border', classes: ['border','border-0','border-thin','border-sm','border-md','border-lg','border-opacity-25','border-opacity-50','border-primary','border-secondary','border-error','border-success'] },
  { title: 'Opacity', classes: ['opacity-0','opacity-25','opacity-50','opacity-75','opacity-100'] },
  { title: 'Spacing Utils', classes: ['mx-auto','my-auto','ms-auto','me-auto','ma-auto'] },
  { title: 'Interaction', classes: ['cursor-pointer','cursor-default','cursor-not-allowed','pointer-events-none','user-select-none'] },
]

const MUTEX_GROUPS: string[][] = [
  ['d-none','d-block','d-inline','d-inline-block','d-flex','d-inline-flex','d-grid'],
  ['flex-row','flex-column','flex-row-reverse','flex-column-reverse'],
  ['flex-wrap','flex-nowrap'],
  ['align-start','align-center','align-end','align-stretch'],
  ['align-self-start','align-self-center','align-self-end','align-self-stretch','align-self-auto'],
  ['justify-start','justify-center','justify-end','justify-space-between','justify-space-around'],
  ['rounded-0','rounded-sm','rounded','rounded-lg','rounded-xl','rounded-pill','rounded-circle'],
  ['text-left','text-center','text-right'],
  ['text-uppercase','text-lowercase','text-capitalize'],
  ['font-weight-thin','font-weight-light','font-weight-regular','font-weight-medium','font-weight-bold','font-weight-black'],
  ['text-caption','text-body-2','text-body-1','text-subtitle-2','text-subtitle-1','text-h6','text-h5','text-h4','text-h3'],
  ['position-relative','position-absolute','position-fixed','position-sticky'],
  ['overflow-hidden','overflow-visible','overflow-auto'],
  ['overflow-x-hidden','overflow-x-auto','overflow-x-visible'],
  ['overflow-y-hidden','overflow-y-auto','overflow-y-visible'],
  ['opacity-0','opacity-25','opacity-50','opacity-75','opacity-100'],
  ['text-primary','text-secondary','text-success','text-info','text-warning','text-error','text-white','text-black','text-disabled','text-medium-emphasis','text-high-emphasis'],
  ['bg-primary','bg-secondary','bg-success','bg-info','bg-warning','bg-error','bg-white','bg-black','bg-surface','bg-background','bg-grey-lighten-5','bg-grey-lighten-4','bg-grey-lighten-3','bg-grey-darken-1','bg-grey-darken-2'],
  ['cursor-pointer','cursor-default','cursor-not-allowed'],
]

const PREFIX_MUTEX = ['elevation-', 'ga-', 'border-opacity-']

export function useClassEditor(
  selectedNode: ComputedRef<UiNode | null>,
  updateClasses: (id: string, classes: string[]) => boolean,
) {
  const classSearch = ref('')
  const filteredGroups = computed(() => {
    const query = classSearch.value.trim().toLowerCase()
    if (!query) return CLASS_GROUPS
    return CLASS_GROUPS
      .map(group => ({ ...group, classes: group.classes.filter(cls => cls.includes(query)) }))
      .filter(group => group.classes.length > 0)
  })

  const toggleClass = (className: string) => {
    if (!selectedNode.value) return
    const classes = selectedNode.value.classes
    if (classes.includes(className)) {
      updateClasses(selectedNode.value.id, classes.filter(cls => cls !== className))
      return
    }
    const mutexGroup = MUTEX_GROUPS.find(group => group.includes(className))
    let nextClasses = mutexGroup ? classes.filter(cls => !mutexGroup.includes(cls)) : [...classes]
    const prefix = PREFIX_MUTEX.find(prefix => className.startsWith(prefix))
    if (prefix) nextClasses = nextClasses.filter(cls => !cls.startsWith(prefix))
    updateClasses(selectedNode.value.id, [...nextClasses, className])
  }

  const addCustomClass = () => {
    if (!classSearch.value.trim() || !selectedNode.value) return
    classSearch.value.trim().split(/\s+/).forEach(toggleClass)
    classSearch.value = ''
  }

  return { classSearch, filteredGroups, toggleClass, addCustomClass }
}
