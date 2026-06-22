import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app';
import { initSocketServer } from './config/socket';
import logger from './utils/logger';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize real-time Socket.io server
initSocketServer(server);

server.listen(PORT, () => {
  logger.info(`FlowSync Server is running on port ${PORT}`);
});
