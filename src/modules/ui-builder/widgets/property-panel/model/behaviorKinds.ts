import { EventName } from '../../../entities/ui-node'

/**
 * What an element can be made to do in Preview. The event kinds have the values of `EventName`; `VIf`, `Model`,
 * `VFor` and `Rules` are also the names of the element's properties.
 */
export enum BehaviorKind {
  Click = 'click',
  Change = 'change',
  Submit = 'submit',
  Mounted = 'mounted',
  VIf = 'vIf',
  Model = 'model',
  VFor = 'vFor',
  Rules = 'rules',
}

export const EVENT_OF_KIND: Partial<Record<BehaviorKind, EventName>> = {
  [BehaviorKind.Click]: EventName.Click,
  [BehaviorKind.Change]: EventName.Change,
  [BehaviorKind.Submit]: EventName.Submit,
  [BehaviorKind.Mounted]: EventName.Mounted,
}
