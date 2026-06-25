import winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Pretty-print format for development — coloured, human-readable.
 */
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

/**
 * JSON format for production — structured for log aggregators (Datadog, Logtail, etc.).
 */
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: isProduction ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
  ],
  // Don't crash on uncaught errors from logger itself
  exitOnError: false,
});

export default logger;
