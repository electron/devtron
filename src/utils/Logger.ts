import type { LogLevel } from '../types/shared';

class Logger {
  private readonly logLevelMap: Record<LogLevel, number> = {
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    none: 5,
  };

  private currentLogLevel: LogLevel = 'debug';
  private currentLogLevelIndex: number = this.logLevelMap[this.currentLogLevel];

  setLogLevel(level: LogLevel) {
    if (this.currentLogLevel === level) return; // no change

    if (this.logLevelMap[level] === undefined) {
      console.error(`Invalid log level: ${level}`);
      return;
    }

    this.currentLogLevel = level;
    this.currentLogLevelIndex = this.logLevelMap[level];
  }

  private log(level: LogLevel, ...args: any[]) {
    if (this.currentLogLevel === 'none') return;
    if (this.logLevelMap[level] < this.currentLogLevelIndex) return;

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
