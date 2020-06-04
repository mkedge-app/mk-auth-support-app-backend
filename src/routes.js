import { Router } from 'express';

import SessionController from './app/controllers/SessionController';
import RequestController from './app/controllers/RequestController';
import CTOController from './app/controllers/CTOController';
import ClientController from './app/controllers/ClientController';

const routes = new Router();

routes.post('/sessions', SessionController.store);
routes.post('/requests', RequestController.show);
routes.post('/requests/status', RequestController.update);
routes.get('/cto/:latitude/:longitude', CTOController.index);
routes.post('/client/:id/:latitude/:longitude', ClientController.update);

export default routes;
