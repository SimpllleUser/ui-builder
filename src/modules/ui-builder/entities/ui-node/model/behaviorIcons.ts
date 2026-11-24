import { BehaviorBadge } from './behaviorSummary'

/** The icon that stands for each kind of behavior, wherever it is drawn. */
export const BEHAVIOR_ICONS: Record<BehaviorBadge, string> = {
  [BehaviorBadge.Repeat]: 'mdi-repeat',
  [BehaviorBadge.Condition]: 'mdi-eye-outline',
  [BehaviorBadge.Link]: 'mdi-link-variant',
  [BehaviorBadge.Click]: 'mdi-cursor-default-click-outline',
}
