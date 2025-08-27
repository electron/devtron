# <img src="https://cloud.githubusercontent.com/assets/378023/15063285/cf554e40-1383-11e6-9b9c-45d381b03f9f.png" width="60px" align="center" alt="Devtron icon"> Devtron

> [!NOTE]
> This project is under development and subject to change.

## Building and Development

- Clone the repository to your local machine
- Run `npm install` to install dependencies
- Run `npm link` to link the package globally
- Run `npm run build` to build the project

#### Configuring an Electron App to use Devtron

- In your Electron app run `npm link @electron/devtron` to link the Devtron package
- In your Electron app's `main.js` (or other relevant file) add the following code to load Devtron:

```js
// main.js
const { devtron } = require('@electron/devtron');
// or import { devtron } from '@electron/devtron'

devtron.install(); // call this function at the top of your file
```

- Devtron can be conditionally installed in **development mode** to avoid impacting production builds. Here's an example:

```js
const { app } = require('electron');

const isDev = !app.isPackaged;

async function installDevtron() {
  const { devtron } = await import('@electron/devtron');
  await devtron.install();
}

if (isDev) {
  installDevtron().catch((error) => {
    console.error('Failed to install Devtron:', error);
  });
}
```

## Devtron API

### `await devtron.install(options)`

Installs Devtron into the Electron app. Refer to [Configuring an Electron App to use Devtron](#configuring-an-electron-app-to-use-devtron) for installation instructions.

#### `Options`

| Option       | Type                                            | Default     | Description                                                                                                                           |
| ------------ | ----------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `quiet`      | `boolean`                                       | `false`     | Suppresses all logs except `error` level logs from appearing in the terminal. Precisely, it ignores `debug`, `info`, and `warn` logs. |
| `ignoreLogs` | `Array<'debug' \| 'info' \| 'warn' \| 'error'>` | `undefined` | List of log levels to ignore, e.g. `['debug', 'info']`. Overrides the `quiet` option if both are set.                                 |

Examples:

```js
await devtron.install({ quiet: true });
```

```js
await devtron.install({ ignoreLogs: ['debug', 'info'] });
```

### `await devtron.getEvents()`

Returns a **promise** that resolves to the array of IPC events recorded by the Devtron service worker since installation.

- If the `Clear all events` button in the Devtron UI is clicked, this array will be cleared.

- If the array size exceeds 20,000 events, it will be truncated to the most recent 20,000 events.
- If called before installation or before the Devtron service worker is ready, an empty array will be returned.

Here's a usage example that keeps logging IPC events every 2 seconds:

```js
// main.js
import { devtron } from '@electron/devtron';

// Ensure Devtron is installed before calling getEvents()
devtron.install();

setInterval(async () => {
  const ipcEvents = await devtron.getEvents();
  console.log('IPC Events:', ipcEvents);
}, 2000);
```

## Requirements and Limitations

- Electron version must be 36.0.0 or higher.
- For Devtron to work with newly created **sessions**, you must call `devtron.install()` before they are created.
- Some IPC events sent immediately after the Electron app starts may not be captured by Devtron, even if `devtron.install()` is called early, because Devtron may take a short time to initialize after starting the app.
- `ipcRenderer.once` will be tracked as two separate events: `ipcRenderer.on` and `ipcRenderer.removeListener`.

If Devtron is installed correctly, it should appear as a tab in the Developer Tools of your Electron app.

<img src="https://github.com/user-attachments/assets/0f278b54-50fe-4116-9317-9c1525bf872b" width="800">
