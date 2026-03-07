import app from './app.js';
import { config } from './config/index.js';
import logger from './config/logger.js';

const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Swagger docs: http://localhost:${PORT}/api-docs`);
  logger.info(`Environment: ${config.nodeEnv}`);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
