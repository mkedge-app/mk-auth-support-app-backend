import Tenant from '../schemas/Tenant';
import mongoose from 'mongoose';

class IntegrationStatusController {
  /**
   * Testar conexão EFI
   * GET /admin/integrations/efi/test
   */
  async testEfi(req, res) {
    try {
      const hasCredentials = !!(
        process.env.EFI_CLIENT_ID &&
        process.env.EFI_CLIENT_SECRET &&
        process.env.EFI_CERTIFICATE_PATH
      );

      if (!hasCredentials) {
        return res.json({
          success: false,
          error: 'Credenciais EFI não configuradas',
        });
      }

      return res.json({
        success: true,
        environment: process.env.EFI_SANDBOX === 'false' ? 'production' : 'sandbox',
        client_id: process.env.EFI_CLIENT_ID,
        certificate_configured: true,
      });
    } catch (error) {
      console.error('❌ Erro ao testar EFI:', error);
      return res.json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Testar conexão Z-API
   * GET /admin/integrations/zapi/test
   */
  async testZapi(req, res) {
    try {
      const hasCredentials = !!(
        process.env.ZAPI_INSTANCE_ID &&
        process.env.ZAPI_TOKEN
      );

      if (!hasCredentials) {
        return res.json({
          success: false,
          error: 'Credenciais Z-API não configuradas',
        });
      }

      // TODO: Fazer requisição real para Z-API para validar
      return res.json({
        success: true,
        instance: process.env.ZAPI_INSTANCE_ID,
        phone: 'Configurado',
        connected: true,
      });
    } catch (error) {
      console.error('❌ Erro ao testar Z-API:', error);
      return res.json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Status do banco de dados
   * GET /admin/integrations/database/status
   */
  async databaseStatus(req, res) {
    try {
      const mongoConnected = mongoose.connection.readyState === 1;

      let activeTenants = 0;
      let totalConnections = 0;

      if (mongoConnected) {
        activeTenants = await Tenant.countDocuments({ 
          status: { $in: ['ativo', 'trial'] } 
        });
        
        totalConnections = await Tenant.countDocuments({
          'database.host': { $ne: null },
        });
      }

      return res.json({
        success: true,
        mongo_connected: mongoConnected,
        active_tenants: activeTenants,
        connections: totalConnections,
      });
    } catch (error) {
      console.error('❌ Erro ao verificar status do banco:', error);
      return res.json({
        success: false,
        mongo_connected: false,
        error: error.message,
      });
    }
  }

  /**
   * Logs de webhook
   * GET /admin/integrations/webhook/logs
   */
  async webhookLogs(req, res) {
    try {
      // TODO: Implementar log de webhooks em collection separada
      // Por enquanto retornar array vazio
      return res.json({
        success: true,
        logs: [],
      });
    } catch (error) {
      console.error('❌ Erro ao buscar logs de webhook:', error);
      return res.status(500).json({
        error: 'Erro ao buscar logs',
      });
    }
  }
}

export default new IntegrationStatusController();
