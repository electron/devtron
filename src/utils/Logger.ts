import type { LogLevel } from '../types/shared';

class Logger {
  private quiet = false;
  private ignoreLogs: Set<LogLevel> = new Set();

  setQuiet(value: boolean) {
    if (this.quiet === value) return; // no change

    this.quiet = value;

    // if quiet is true, ignore all logs except 'error'
    if (this.quiet) {
      this.ignoreLogs.add('debug');
      this.ignoreLogs.add('info');
      this.ignoreLogs.add('warn');
    } else {
      this.ignoreLogs.delete('debug');
      this.ignoreLogs.delete('info');
      this.ignoreLogs.delete('warn');
    }
  }

  setIgnoreLogs(levels: LogLevel[]) {
    this.ignoreLogs = new Set(levels);
  }

  private log(level: LogLevel, ...args: any[]) {
    if (this.ignoreLogs.has(level)) return;

    switch (level) {
      case 'debug':
        console.debug(...args);
        break;
      case 'info':
        console.log(...args);
        break;
      case 'warn':
        console.warn(...args);
        break;
      case 'error':
        console.error(...args);
        break;
    }
  }

  debug(...args: any[]) {
    this.log('debug', ...args);
  }
  info(...args: any[]) {
    this.log('info', ...args);
  }
  warn(...args: any[]) {
    this.log('warn', ...args);
  }
  error(...args: any[]) {
    this.log('error', ...args);
  }
}

export const logger = new Logger();
