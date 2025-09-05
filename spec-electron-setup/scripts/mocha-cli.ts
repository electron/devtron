import { expect } from 'chai';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * This test spawns a child process to run the Electron spec runner script.
 * It ensures that the Electron tests complete successfully by checking
 * the exit code of the child process.
 */
describe('Electron Spec Runner', function () {
  this.timeout(1000 * 60); // 60 seconds

  it('should complete Electron tests successfully', (done) => {
    const runnerPath = path.resolve(__dirname, './spec-runner.ts');
    const child = spawn('npx', ['tsx', `"${runnerPath}"`], { stdio: 'inherit', shell: true });

    child.on('close', (code) => {
      expect(code).to.equal(0, 'Electron exited with non-zero status');
      done();
    });

    child.on('error', (err) => {
      done(err);
    });
  });
});
