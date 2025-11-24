// utils/logger.ts - Logging utility for pipeline

import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
}

class Logger {
  private logLevel: LogLevel = LogLevel.INFO;
  private logFilePath?: string;

  constructor(logLevel: LogLevel = LogLevel.INFO, logFilePath?: string) {
    this.logLevel = logLevel;
    this.logFilePath = logFilePath;

    // Create log directory if it doesn't exist
    if (this.logFilePath) {
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.SUCCESS];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatMessage(level: LogLevel, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `\n${JSON.stringify(context, null, 2)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  private getConsoleColor(level: LogLevel): string {
    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[37m', // White
      [LogLevel.WARN]: '\x1b[33m', // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.SUCCESS]: '\x1b[32m', // Green
    };
    return colors[level] || '\x1b[37m';
  }

  private log(level: LogLevel, message: string, context?: any): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, context);

    // Console output with colors
    const color = this.getConsoleColor(level);
    const reset = '\x1b[0m';
    console.log(`${color}${formattedMessage}${reset}`);

    // File output
    if (this.logFilePath) {
      fs.appendFileSync(this.logFilePath, formattedMessage + '\n');
    }
  }

  debug(message: string, context?: any): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: any): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: any): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: any): void {
    this.log(LogLevel.ERROR, message, context);
  }

  success(message: string, context?: any): void {
    this.log(LogLevel.SUCCESS, message, context);
  }

  /**
   * Log a separator line for better readability
   */
  separator(): void {
    const line = '='.repeat(80);
    console.log(line);
    if (this.logFilePath) {
      fs.appendFileSync(this.logFilePath, line + '\n');
    }
  }

  /**
   * Log a section header
   */
  section(title: string): void {
    this.separator();
    this.info(title.toUpperCase());
    this.separator();
  }
}

// Export singleton instance
export const logger = new Logger(LogLevel.DEBUG, './logs/data-import.log');
