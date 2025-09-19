// services/logger.service.ts
export class Logger {
  private context: string;

  constructor(context: string = 'Application') {
    this.context = context;
  }

  private formatMessage(level: string, message: string, metadata?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] [${level}] [${this.context}] ${message}${metaStr}`;
  }

  info(message: string, metadata?: any): void {
    console.log(this.formatMessage('INFO', message, metadata));
  }

  error(message: string, error?: any, metadata?: any): void {
    const errorDetails =
      error instanceof Error ? { message: error.message, stack: error.stack } : error;

    const combinedMeta = { ...metadata, error: errorDetails };
    console.error(this.formatMessage('ERROR', message, combinedMeta));
  }

  warn(message: string, metadata?: any): void {
    console.warn(this.formatMessage('WARN', message, metadata));
  }

  debug(message: string, metadata?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('DEBUG', message, metadata));
    }
  }
}
