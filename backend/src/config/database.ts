import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient({
  log: ['info', 'warn', 'error'],
});

prisma.$connect()
  .then(() => {
    logger.info('Successfully connected to PostgreSQL via Prisma');
  })
  .catch((err) => {
    logger.error('Failed to connect to PostgreSQL database', err);
  });

export default prisma;
