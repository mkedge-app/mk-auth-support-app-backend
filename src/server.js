import ip from 'ip';
import app from './app';
import logger from './logger';
import appConfig from './config/app';
import ReminderJob from './app/jobs/ReminderJob';
import TrialExpirationJob from './app/jobs/TrialExpirationJob';
import AutoReconnectJob from './app/jobs/AutoReconnectJob';

logger.info(
  `This is internal URL of the application: ${ip.address()}:${
    appConfig.app_port
  }`
);

const server = app.listen(appConfig.app_port);

// Iniciar jobs agendados
ReminderJob.start();
TrialExpirationJob.start();
AutoReconnectJob.start();
logger.info('📅 Jobs de notificações, trial e reconexão automática iniciados');

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  logger.error({ err: error, stack: error?.stack }, 'Uncaught Exception');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ err: reason, promise }, 'Unhandled Rejection');
});
