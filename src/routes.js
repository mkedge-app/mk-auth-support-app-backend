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
import PlanController from './app/controllers/PlanController';
import AdminSessionController from './app/controllers/AdminSessionController';
import SignupController from './app/controllers/SignupController';
import IntegrationController from './app/controllers/IntegrationController';

import authMiddleware from './app/middlewares/auth';
import adminAuthMiddleware from './app/middlewares/adminAuth';
import permissionMiddleware from './app/middlewares/permission';
import { ConnectionResolver } from './app/middlewares/connectionResolver';
import ConnectController from './app/controllers/ConnectController';
import ProviderStatusController from './app/controllers/ProviderStatusController';
import PaymentController from './app/controllers/PaymentController';

const routes = new Router();

// ===== ROTAS PÚBLICAS (Sem autenticação, sem ConnectionResolver) =====

// Webhooks (EFI e Z-API)
routes.post('/webhook/efi/pix', WebhookController.efiPix);
routes.post('/webhook/efi/boleto', WebhookController.efiBoleto);
routes.post('/webhook/zapi', WebhookController.zapiStatus);

// Assinaturas e Pagamentos (antigos - manter compatibilidade)
routes.post('/connect', ConnectController.store);
routes.post('/assinatura', ProviderStatusController.update);
routes.post('/payment', PaymentController.index);

// Cadastro público de novos clientes
routes.post('/signup', SignupController.store);

// ===== ADMIN - AUTENTICAÇÃO =====
routes.post('/admin/login', AdminSessionController.store);

// ===== ADMIN - ROTAS PROTEGIDAS =====
// Todas as rotas admin requerem autenticação
routes.use('/admin', adminAuthMiddleware);
routes.get('/admin/validate', AdminSessionController.validate);

// Gerenciamento de Providers/Tenants (Admin)
routes.get('/admin/providers', ProviderController.index);
routes.post('/admin/provider', ProviderController.create);
routes.put('/admin/provider/:tenant_id', ProviderController.update);
routes.get('/admin/provider/:tenant_id', ProviderController.show);
routes.delete('/admin/provider/:tenant_id', ProviderController.delete);

// Sistema de Assinaturas (Admin)
routes.get('/admin/subscriptions', SubscriptionController.index);
routes.get('/admin/subscription/:id', SubscriptionController.show);
routes.post('/admin/subscription', SubscriptionController.create);
routes.post('/admin/subscription/:subscription_id/invoice', SubscriptionController.generateInvoice);
routes.post('/admin/subscription/:id/cancel', SubscriptionController.cancel);
routes.post('/admin/subscription/:id/suspend', SubscriptionController.suspend);
routes.post('/admin/subscription/:id/reactivate', SubscriptionController.reactivate);

// Controle de status do tenant (Admin)
routes.post('/admin/tenant/:id/activate', ProviderController.activate);
routes.post('/admin/tenant/:id/deactivate', ProviderController.deactivate);
routes.post('/admin/tenant/:id/connect-database', ProviderController.connectDatabase);
routes.post('/admin/tenant/:id/disconnect-database', ProviderController.disconnectDatabase);
routes.post('/admin/tenant/:id/sync-status', ProviderController.syncStatusWithSubscription);
routes.post('/admin/tenants/sync-all', ProviderController.syncAllTenants);

// Planos de Assinatura (Admin)
routes.get('/admin/plans', PlanController.index);
routes.get('/admin/plan/:id', PlanController.show);
routes.post('/admin/plan', PlanController.create);
routes.put('/admin/plan/:id', PlanController.update);
routes.delete('/admin/plan/:id', PlanController.delete);
routes.post('/admin/plan/:id/toggle', PlanController.toggleActive);
routes.post('/admin/plans/seed', PlanController.seed);

// Gerenciamento de planos de tenants (Admin)
routes.put('/admin/tenant/:tenantId/plan', PlanController.updateTenantPlan);
routes.post('/admin/tenant/:tenantId/check-limit', PlanController.checkClientLimit);
routes.post('/admin/plan/calculate-upgrade', PlanController.calculateUpgrade);

// Notificações (Admin)
routes.get('/admin/notifications', NotificationController.index);
routes.post('/admin/notifications', NotificationController.create);

// Faturas (Admin)
routes.get('/admin/invoices', InvoiceController.index);
routes.get('/admin/invoice/:id', InvoiceController.show);
routes.post('/admin/invoice/:id/pay', InvoiceController.markAsPaid);

// Integrações (Admin) - Status e Testes EFI/Z-API (globais do sistema)
routes.get('/admin/integrations/status', IntegrationController.status);
routes.post('/admin/integrations/efi/test', IntegrationController.testEfi);
routes.post('/admin/integrations/zapi/test', IntegrationController.testZapi);
routes.post('/admin/integrations/test-message', IntegrationController.sendTestMessage);

// ===== ROTAS PÚBLICAS DE VISUALIZAÇÃO =====
// Essas rotas são públicas para landing page, etc
routes.get('/providers', ProviderController.index);
routes.get('/plans', PlanController.index);
routes.get('/plan/:id', PlanController.show);

// ===== ROTAS QUE REQUEREM TENANT (Com ConnectionResolver) =====

// Aplica ConnectionResolver para todas as rotas abaixo
routes.use(ConnectionResolver);

// Sessão/Login (não requer autenticação, mas requer tenant)
routes.post('/sessions', SessionController.store);
routes.get('/app/structure', AppStructureController.index);

// Rotas autenticadas (requer token JWT)
routes.use(authMiddleware);

// Dados do tenant/provedor
routes.get('/tenant', ProviderController.show);
routes.get('/provedor', ProviderController.show); // Alias em português

// Chamados
routes.post('/requests', RequestController.index);
routes.post('/request', RequestController.store); // Criar novo chamado
routes.get('/request/form/:client_id', RequestController.getFormData); // Dados para formulário de abertura
routes.get('/request/:id/:request_type', RequestController.show);
routes.get('/chamados/stats', RequestController.stats);

// Clientes
routes.get('/client/:id', ClientController.show);
routes.get('/cliente/:id', ClientController.show); // Alias em português

// CTOs
routes.get('/cto/:latitude/:longitude', CTOController.index);
routes.get('/cto/:lat/:lng', CTOController.index); // Alias com lat/lng
routes.get('/cto/map/:latitude/:longitude', CTOController.map);
routes.get('/cto', CTOController.show);

// Funcionários
routes.get('/employees', EmployeeController.index);
routes.get('/technicians', EmployeeController.index); // Alias para /employees
routes.get('/employee/:id', EmployeeController.show);

// Busca
routes.get('/search', SearchController.index);

// Conexões
routes.get('/connections/:id', UserConnectionsController.show);

// Faturas
routes.get('/invoices/:client_id', InvoiceController.show);
routes.get('/invoice/:id', InvoiceController.getById); // Buscar fatura por ID
routes.post('/invoice/pay', InvoiceController.payInvoice); // Dar baixa em fatura

// Notificações
routes.get('/notification/:employee_id', NotificationController.show);
routes.put('/notification', NotificationController.update);

// Mensagens
routes.get('/messages', MessageController.show);

// Histórico
routes.get('/requests/history', HistoryController.show);
routes.get('/requests/overdue', OverdueRequestController.index);

// Dashboard Stats
routes.get('/dashboard/stats', DashboardController.stats);

// Rotas com permissões especiais
routes.use(permissionMiddleware);

routes.post('/request/:id', RequestController.update);
routes.post('/messages', MessageController.store);
routes.post('/client/:id', ClientController.update);
routes.put('/client/:id', ClientController.update); // Método PUT também
routes.put('/cliente/:id', ClientController.update); // Alias em português com PUT

export default routes;
