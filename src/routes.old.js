import { Router } from 'express';

import CTOController from './app/controllers/CTOController';
import ClientController from './app/controllers/ClientController';
import SearchController from './app/controllers/SearchController';
import RequestController from './app/controllers/RequestController';
import InvoiceController from './app/controllers/InvoiceController';
import MessageController from './app/controllers/MessageController';
import HistoryController from './app/controllers/HistoryController';
import SessionController from './app/controllers/SessionController';
import EmployeeController from './app/controllers/EmployeeController';
import ProviderController from './app/controllers/ProviderController';
import NotificationController from './app/controllers/NotificationController';
import OverdueRequestController from './app/controllers/OverdueRequestController';
import UserConnectionsController from './app/controllers/UserConnectionsController';
import AppStructureController from './app/controllers/AppStructureController';
import DashboardController from './app/controllers/DashboardController';
import SubscriptionController from './app/controllers/SubscriptionController';
import WebhookController from './app/controllers/WebhookController';

import authMiddleware from './app/middlewares/auth';
import permissionMiddleware from './app/middlewares/permission';
import { ConnectionResolver } from './app/middlewares/connectionResolver';
import ConnectController from './app/controllers/ConnectController';
import ProviderStatusController from './app/controllers/ProviderStatusController';
import PaymentController from './app/controllers/PaymentController';

const routes = new Router();

// ===== ROTAS PÚBLICAS (Sem autenticação) =====

// Gerenciamento de Providers/Tenants
routes.get('/providers', ProviderController.index);
routes.post('/provider', ProviderController.create);
routes.put('/provider/:tenant_id', ProviderController.update);
routes.get('/provider/:tenant_id', ProviderController.show);

// Webhooks (EFI e Z-API)
routes.post('/webhook/efi/pix', WebhookController.efiPix);
routes.post('/webhook/efi/boleto', WebhookController.efiBoleto);
routes.post('/webhook/zapi', WebhookController.zapiStatus);

// Assinaturas e Pagamentos (antigos - manter compatibilidade)
routes.post('/connect', ConnectController.store);
routes.post('/assinatura', ProviderStatusController.update);
routes.post('/payment', PaymentController.index);

// ===== SISTEMA DE ASSINATURAS (Novo) =====
// Rotas para gerenciamento completo de assinaturas
routes.get('/subscriptions', SubscriptionController.index);
routes.get('/subscription/:id', SubscriptionController.show);
routes.post('/subscription', SubscriptionController.create);
routes.post('/subscription/:subscription_id/invoice', SubscriptionController.generateInvoice);
routes.post('/subscription/:id/cancel', SubscriptionController.cancel);
routes.post('/subscription/:id/suspend', SubscriptionController.suspend);
routes.post('/subscription/:id/reactivate', SubscriptionController.reactivate);

routes.use(ConnectionResolver);
// Alterna o banco de dados conforme o cliente

routes.post('/sessions', SessionController.store);

routes.get('/app/structure', AppStructureController.index);

routes.use(authMiddleware);

// Dados do tenant/provedor
routes.get('/tenant', ProviderController.show);

routes.post('/requests', RequestController.index);
routes.get('/request/:id/:request_type', RequestController.show);

routes.get('/client/:id', ClientController.show);

routes.get('/cto/:latitude/:longitude', CTOController.index);
routes.get('/cto/map/:latitude/:longitude', CTOController.map);
routes.get('/cto', CTOController.show);

routes.get('/employees', EmployeeController.index);
routes.get('/employee/:id', EmployeeController.show);

routes.get('/search', SearchController.index);

routes.get('/connections/:id', UserConnectionsController.show);

routes.get('/invoices/:client_id', InvoiceController.show);

routes.get('/notification/:employee_id', NotificationController.show);
routes.put('/notification', NotificationController.update);

routes.get('/messages', MessageController.show);

routes.get('/requests/history', HistoryController.show);
routes.get('/requests/overdue', OverdueRequestController.index);

// 📊 Dashboard Stats (requer autenticação)
routes.get('/dashboard/stats', DashboardController.stats);

routes.use(permissionMiddleware);
// Verifica se o usuário tem permissão

routes.post('/request/:id', RequestController.update);
routes.post('/messages', MessageController.store);
routes.post('/client/:id', ClientController.update);

export default routes;
