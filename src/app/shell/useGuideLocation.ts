import { computed } from 'vue'
import { useUrlSearchParams } from '@vueuse/core'
import { GuideSection, isGuideSection } from '../../modules/ui-builder/widgets/behavior-guide'

const GUIDE_PARAM = 'guide'

/**
 * The Behavior guide as an address: `/?guide` opens it, `/?guide=conditions` opens a section.
 * Opening, closing and changing section keep the address in step, so the link can be copied.
 */
export function useGuideLocation() {
  const params = useUrlSearchParams('history')
  const section = computed<GuideSection>({
    get: () => (isGuideSection(params[GUIDE_PARAM]) ? params[GUIDE_PARAM] : GuideSection.Overview),
    set: value => {
      params[GUIDE_PARAM] = value
    },
  })
  const open = computed({
    get: () => typeof params[GUIDE_PARAM] === 'string',
    set: value => {
      if (value) params[GUIDE_PARAM] = section.value
      else delete params[GUIDE_PARAM]
    },
  })
  return { open, section }
}
