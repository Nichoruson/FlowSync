import dotenv from 'dotenv';
dotenv.config();

// ─── Environment guard — fail fast before any imports ────────────────────────
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'] as const;
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.error(`[FATAL] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

import http from 'http';
import app from './app';
import { initSocketServer } from './config/socket';
import prisma from './config/database';
import logger from './utils/logger';

const PORT = parseInt(process.env.PORT || '5000', 10);
const server = http.createServer(app);

// Initialize real-time Socket.io server
initSocketServer(server);

server.listen(PORT, () => {
  logger.info(`FlowSync Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  logger.info(`${signal} received — shutting down gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed');
    await prisma.$disconnect();
    logger.info('Database connection closed');
    process.exit(0);
  });

  // Force exit after 10s if connections don't drain
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { err });
  process.exit(1);
});
