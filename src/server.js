import app from './app';
import logger from './logger';
import appConfig from './config/app';

logger.info(`This application is listening at the port: ${appConfig.app_port}`);
app.listen(appConfig.app_port);
