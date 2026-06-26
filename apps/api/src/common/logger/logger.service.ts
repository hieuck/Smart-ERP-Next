import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';

export interface StructuredLogEntry {
  timestamp: string;
  level: 'log' | 'error' | 'warn' | 'debug' | 'verbose';
  message: string;
  requestId?: string;
  context?: string;
  meta?: Record<string, any>;
}

@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLogger implements NestLoggerService {
  private context?: string;
  private requestId?: string;

  setContext(context: string) { this.context = context; }
  setRequestId(requestId: string) { this.requestId = requestId; }

  log(message: any, context?: string) { this.print('log', message, context); }
  error(message: any, trace?: string, context?: string) { this.print('error', message, context, { trace }); }
  warn(message: any, context?: string) { this.print('warn', message, context); }
  debug(message: any, context?: string) { this.print('debug', message, context); }
  verbose(message: any, context?: string) { this.print('verbose', message, context); }

  private print(level: string, message: any, context?: string, extra?: Record<string, any>) {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level: level as any,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      context: context || this.context,
      requestId: this.requestId,
      meta: extra,
    };
    const output = JSON.stringify(entry);
    if (level === 'error') {
      console.error(output);
    } else {
      console.log(output);
    }
  }
}
