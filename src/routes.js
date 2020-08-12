import { Router } from 'express';

import SessionController from './app/controllers/SessionController';
import RequestController from './app/controllers/RequestController';
import CTOController from './app/controllers/CTOController';
import ClientController from './app/controllers/ClientController';
import EmployeeController from './app/controllers/EmployeeController';
import SearchController from './app/controllers/SearchController';
import UserConnectionsController from './app/controllers/UserConnectionsController';
import InvoiceController from './app/controllers/InvoiceController';

import authMiddleware from './app/middlewares/auth';

const routes = new Router();

routes.post('/sessions', SessionController.store);

routes.use(authMiddleware);

routes.post('/requests', RequestController.index);
routes.get('/request/:id', RequestController.show);
routes.post('/request/:id', RequestController.update);

routes.post('/client/:id', ClientController.update);
routes.get('/client/:id', ClientController.show);

routes.get('/cto/:latitude/:longitude', CTOController.index);
routes.get('/cto/:cto_name', CTOController.show);

routes.get('/employees', EmployeeController.index);
routes.get('/employee/:id', EmployeeController.show);

routes.get('/search', SearchController.index);

routes.get('/connections/:id', UserConnectionsController.show);

routes.get('/invoices/:id', InvoiceController.show);

export default routes;
