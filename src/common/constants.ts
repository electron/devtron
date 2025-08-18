const PORT_NAME = {
  PANEL: 'devt-panel',
  CONTENT_SCRIPT: 'devt-content-script',
} as const;

const MSG_TYPE = {
  PING: 'ping',
  PONG: 'pong',
  GET_ALL_EVENTS: 'get-all-events',
  RENDER_EVENT: 'render-event',
  CLEAR_EVENTS: 'clear-events',
  EVENTS_CLEARED_ACK: 'events-cleared-ack',
  ADD_IPC_EVENT: 'add-ipc-event',
  SEND_TO_PANEL: 'send-to-panel',
} as const;

/**
 * These channels are used internally by Devtron, and tracking them may lead to unnecessary noise.
 * Hence, they are ignored by Devtron.
 */
const excludedIpcChannels = ['devtron-ipc-events'];

export { PORT_NAME, MSG_TYPE, excludedIpcChannels };
