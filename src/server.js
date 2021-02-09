import ip from 'ip';
import app from './app';
import logger from './logger';
import appConfig from './config/app';

logger.info(
  `This is internal URL of the application: ${ip.address()}:${
    appConfig.app_port
  }`
);

app.listen(appConfig.app_port);
