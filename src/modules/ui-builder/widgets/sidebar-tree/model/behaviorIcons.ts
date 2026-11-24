import { BehaviorBadge } from '../../../entities/ui-node'

export const BEHAVIOR_ICONS: Record<BehaviorBadge, string> = {
  [BehaviorBadge.Repeat]: 'mdi-repeat',
  [BehaviorBadge.Condition]: 'mdi-eye-outline',
  [BehaviorBadge.Link]: 'mdi-link-variant',
  [BehaviorBadge.Click]: 'mdi-cursor-default-click-outline',
}
