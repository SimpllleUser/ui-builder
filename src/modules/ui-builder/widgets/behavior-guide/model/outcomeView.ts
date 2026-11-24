import { PlaygroundOutcome } from './conditionPlayground'

interface OutcomeView {
  label: string
  color: string
  icon: string
}

export const OUTCOME_VIEW: Record<PlaygroundOutcome, OutcomeView> = {
  [PlaygroundOutcome.Shown]: { label: 'Shown', color: 'success', icon: 'mdi-eye-outline' },
  [PlaygroundOutcome.Hidden]: { label: 'Hidden', color: 'secondary', icon: 'mdi-eye-off-outline' },
  [PlaygroundOutcome.Unreadable]: {
    label: 'Cannot be read (Preview shows it)',
    color: 'warning',
    icon: 'mdi-alert-outline',
  },
}
