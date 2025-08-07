import type { IpcEventDataIndexed } from '../../../types/shared';

export const events: IpcEventDataIndexed[] = [
  {
    serialNumber: 1,
    direction: 'renderer-to-main',
    channel: 'ping',
    args: [],
    timestamp: 1749114386179,
  },
  {
    serialNumber: 12,
    timestamp: 1749114386181,
    direction: 'main-to-renderer',
    channel: 'test-ipc',
    args: [
      {
        hello: 'world from main',
      },
    ],
  },
  {
    serialNumber: 123,
    direction: 'renderer-to-main',
    method: 'on',
    channel: 'hello-renderer',
    args: ['random string as argument lol'],
    timestamp: 1749114386627,
  },
  {
    serialNumber: 124,
    direction: 'renderer-to-main',
    channel: 'ping',
    args: [],
    timestamp: 1749114387250,
  },
  {
    serialNumber: 125,
    direction: 'renderer',
    channel: 'renderer-check',
    method: 'removeAllListeners',
    args: [],
    timestamp: 1749114387250,
  },
  {
    serialNumber: 126,
    direction: 'renderer',
    method: 'removeListener',
    channel: '',
    args: [],
    timestamp: 1749114387250,
  },
  {
    serialNumber: 127,
    direction: 'service-worker-to-main',
    channel: 'sw-check',
    args: [],
    timestamp: 1749114387250,
  },
  {
    serialNumber: 128,
    timestamp: 1749114387251,
    direction: 'main-to-renderer',
    channel: 'test-ipc',
    args: [
      {
        id: 10234,
        username: 'coolcat42',
        email: 'coolcat42@example.com',
        profile: {
          first_name: 'Lena',
          last_name: 'Martinez',
          age: 27,
          verified: true,
          preferences: {
            newsletter: false,
            theme: 'dark',
            language: 'en-US',
          },
        },
        friends: [
          { id: 203, name: 'Jake', online: true },
          { id: 204, name: 'Mira', online: false },
        ],
        last_login: '2025-06-05T08:23:14Z',
        tags: ['photography', 'travel', 'books'],
        metrics: {
          posts: 142,
          likes: 3892,
          followers: 521,
        },
      },
    ],
  },
  {
    serialNumber: 129,
    direction: 'main-to-service-worker',
    channel: 'sw-check-2',
    args: ['Hello from main to service worker!'],
    timestamp: 1749114387250,
    serviceWorkerDetails: {
      serviceWorkerScope: 'chrome-extension://floigfkhicjhinimocdoblflbmefpjeg/',
      serviceWorkerVersionId: 32,
    },
  },
];
