/**
 * @fileOverview Server-side logging utility for production monitoring.
 * Logs structured metadata for operational visibility without exposing sensitive content.
 */

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogMetadata {
  operation: string;
  status: 'success' | 'failure' | 'rate_limit';
  durationMs?: number;
  userId?: string;
  schoolName?: string;
  errorCategory?: string;
  errorCode?: string;
  requestId?: string;
}

/**
 * Logs structured data to the server console.
 * In a production environment, these are captured by Cloud Logging (Vercel/Google Cloud).
 */
export function serverLog(level: LogLevel, metadata: LogMetadata) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    ...metadata,
  };

  const output = JSON.stringify(logEntry);

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}
