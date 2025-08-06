# Devtron

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
const isDev = true

async function installDevtron() {
  const { devtron } = await import('@electron/devtron')
  await devtron.install()
}

if (isDev) {
  installDevtron().catch((error) => {
    console.error('Failed to install Devtron:', error)
  })
}
```

## Requirements and Limitations

- Electron version must be 36.0.0 or higher.
- For Devtron to work with newly created **sessions**, you must call `devtron.install()` before they are created.
- Some IPC events sent immediately after the Electron app starts may not be captured by Devtron, even if `devtron.install()` is called early, because Devtron may take a short time to initialize after starting the app.
- `ipcRenderer.once` will be tracked as two separate events `ipcRenderer.on` and then `ipcRenderer.removeListener`.

If Devtron is installed correctly, it should appear as a tab in the Developer Tools of your Electron app.

<img src="https://github.com/user-attachments/assets/0f278b54-50fe-4116-9317-9c1525bf872b" width="800">
