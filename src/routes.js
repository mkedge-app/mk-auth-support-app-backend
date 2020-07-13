import { Router } from 'express';

import SessionController from './app/controllers/SessionController';
import RequestController from './app/controllers/RequestController';
import CTOController from './app/controllers/CTOController';
import ClientController from './app/controllers/ClientController';
import EmployeeController from './app/controllers/EmployeeController';

import authMiddleware from './app/middlewares/auth';

const routes = new Router();

routes.post('/sessions', SessionController.store);

routes.use(authMiddleware);

routes.post('/requests', RequestController.index);
routes.get('/request/:id', RequestController.show);
routes.post('/request/:id', RequestController.update);

routes.get('/clients', ClientController.index);
routes.post('/client/:id', ClientController.update);
routes.get('/client/:id', ClientController.show);

routes.get('/cto/:latitude/:longitude', CTOController.index);
routes.get('/cto/:cto_name', CTOController.show);

routes.get('/employees', EmployeeController.index);

export default routes;
