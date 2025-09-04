import type { LogLevelString } from '../types/shared';
import { LogLevel } from '../types/shared';

class Logger {
  private currentLogLevel = LogLevel.debug;

  setLogLevel(level: LogLevelString) {
    if (LogLevel[level] === undefined) {
      console.error(`Invalid log level: ${level}`);
      return;
    }

    if (LogLevel[level] === this.currentLogLevel) return; // no change

    this.currentLogLevel = LogLevel[level];
  }

  private log(level: LogLevel, ...args: any[]) {
    if (this.currentLogLevel === LogLevel.none) return;
    if (level < this.currentLogLevel) return;

    switch (level) {
      case LogLevel.debug:
        console.debug(...args);
        break;
      case LogLevel.info:
        console.log(...args);
        break;
      case LogLevel.warn:
        console.warn(...args);
        break;
      case LogLevel.error:
        console.error(...args);
        break;
    }
  }

  debug(...args: any[]) {
    this.log(LogLevel.debug, ...args);
  }
  info(...args: any[]) {
    this.log(LogLevel.info, ...args);
  }
  warn(...args: any[]) {
    this.log(LogLevel.warn, ...args);
  }
  error(...args: any[]) {
    this.log(LogLevel.error, ...args);
  }
}

export const logger = new Logger();
