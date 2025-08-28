const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const Mocha = require('mocha');
require('colors');
const fs = require('node:fs/promises');
// app.commandLine.appendSwitch('enable-logging');

/**
 * Terminate the app if an uncaught exception or unhandled rejection occurs
 * instead of opening a dialog box or leaving the app running.
 */
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception while running main spec:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection while running main spec:', reason);
  process.exit(1);
});

const pass = '[PASS]'.green;
const fail = '[FAIL]'.red;

let mainTestDone = false;
let mainFailures = 0;
const cleanupTestSessions = async () => {
  const userDataPath = app.getPath('userData');
  const sessionsPath = path.join(userDataPath, 'Partitions');
  const serviceWorkerPath = path.join(userDataPath, 'Service Worker');
  let sessions;

  console.log(`Deleting: ${serviceWorkerPath}`.cyan);
  await fs.rm(serviceWorkerPath, { recursive: true, force: true });

  try {
    sessions = await fs.readdir(sessionsPath);
  } catch (err) {
    if (err.code === 'ENOENT') console.log(`No sessions found at ${sessionsPath}`.yellow);
    else console.error(`Error reading sessions directory: ${err.message}`.red);
    return;
  }

  sessions = sessions.filter((session) => session.startsWith('devtron-test-'));
  if (sessions.length === 0) return;

  for (const session of sessions) {
    const sessionPath = path.join(sessionsPath, session);
    console.log(`Deleting session: ${sessionPath}`.cyan);
    await fs.rm(sessionPath, { recursive: true, force: true });
  }
};

/* Exit the app after tests are done */
async function maybeExit() {
  if (mainTestDone) {
    console.log('\n/* ==================== TEST SUMMARY ==================== */'.cyan);
    if (mainFailures) {
      console.log(`Main process failures: ${mainFailures}`);
      console.log(`${fail} Test suite finished with ${mainFailures} failure(s).`);
    } else {
      console.log(`${pass} All electron tests passed.`);
    }

    console.log('\n/* ====================================================== */'.cyan);

    app.exit(mainFailures > 0 ? 1 : 0);
  }
}

/* Create test browser window */
let mainWindow;
function createTestWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
    },
  });

  // mainWindow.webContents.openDevTools();
  mainWindow.loadURL(pathToFileURL(path.join(__dirname, 'index.html')).toString());
}

/* Run Mocha tests in the main process */
async function runMainProcessTests() {
  require('ts-node').register({
    compilerOptions: {
      module: 'commonjs',
    },
  });

  const mochaOptions = {};
  if (process.env.MOCHA_REPORTER) {
    mochaOptions.reporter = process.env.MOCHA_REPORTER;
  }
  if (process.env.MOCHA_MULTI_REPORTERS) {
    mochaOptions.reporterOptions = {
      reporterEnabled: process.env.MOCHA_MULTI_REPORTERS,
    };
  }

  const mocha = new Mocha({
    timeout: 10000,
    ui: 'bdd',
    color: true,
  });

  const testFiles = [path.join(__dirname, '..', '..', 'spec', 'devtron-install-spec.ts')];

  if (testFiles.length === 0) {
    console.error('No test files found.');
    mainTestDone = true;
    maybeExit();
    return;
  }

  testFiles.sort().forEach((file) => {
    mocha.addFile(file);
  });

  mocha.run((failures) => {
    mainFailures = failures;
    if (failures > 0) {
      console.error(`${fail} ${failures} main process test(s) failed.`);
    } else {
      console.log(`${pass} All main process tests passed.`);
    }

    mainTestDone = true;
    maybeExit();
  });
}

/* Start the Electron app */
app.whenReady().then(async () => {
  await cleanupTestSessions();
  createTestWindow();
  await runMainProcessTests();
});
