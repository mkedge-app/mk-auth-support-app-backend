import { Router } from 'express';

import SessionController from './app/controllers/SessionController';
import RequestController from './app/controllers/RequestController';

const routes = new Router();

routes.post('/sessions', SessionController.store);
routes.post('/requests', RequestController.show);
routes.post('/requests/status', RequestController.update);

export default routes;
