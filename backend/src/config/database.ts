import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const isDev = process.env.NODE_ENV === 'development';

const prisma = new PrismaClient({
  log: isDev 
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ]
    : ['info', 'warn', 'error'],
});

if (isDev) {
  (prisma as any).$on('query', (e: any) => {
    logger.debug(`Query: ${e.query} - Params: ${e.params} - Duration: ${e.duration}ms`);
  });
}

prisma.$connect()
  .then(() => {
    logger.info('Successfully connected to PostgreSQL via Prisma');
  })
  .catch((err) => {
    logger.error('Failed to connect to PostgreSQL database', err);
  });

export default prisma;
