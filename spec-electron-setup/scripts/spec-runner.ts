import { spawnSync } from 'node:child_process';
import path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const electronPath: string = require(process.env.ELECTRON_PKG || 'electron');
import 'colors';

async function main(): Promise<void> {
  const runnerArgs = ['spec-electron-setup/electron/main.js'];
  const cwd = path.resolve(__dirname, '..', '..');

  const { status, signal } = spawnSync(electronPath, runnerArgs, {
    cwd,
    stdio: 'inherit',
  });

  if (status !== 0) {
    console.error(`Electron exited with status ${status}, signal: ${signal}`);
    process.exit(status ?? 1);
  }
}

main()
  .then(() => {
    console.log('Electron process completed');
  })
  .catch((error) => {
    console.error('Error running Electron process:', error);
  });
