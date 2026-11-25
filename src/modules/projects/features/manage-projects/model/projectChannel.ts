export enum ProjectEvent {
  Saved = 'saved',
  Removed = 'removed',
  /** A project was added or renamed. */
  ListChanged = 'list-changed',
}

export interface ProjectMessage {
  event: ProjectEvent
  id: string
  /** The revision written, for `Saved`. */
  revision?: number
}

/** How tabs tell each other what they did. A tab does not receive its own messages. */
export interface ProjectChannel {
  post(message: ProjectMessage): void
  subscribe(listener: (message: ProjectMessage) => void): void
}

const CHANNEL_NAME = 'ui-builder:projects'

export function openProjectChannel(): ProjectChannel {
  const channel = new BroadcastChannel(CHANNEL_NAME)
  return {
    post: message => channel.postMessage(message),
    subscribe: listener => {
      channel.addEventListener('message', ({ data }: MessageEvent<ProjectMessage>) => listener(data))
    },
  }
}
