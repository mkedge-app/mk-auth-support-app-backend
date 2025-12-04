import EfiService from '../helpers/EfiService';
import ZApiService from '../helpers/ZApiService';
import integrationsConfig from '../../config/integrations';
import logger from '../../logger';

/**
 * Controller para gerenciar integrações EFI e Z-API (GLOBAIS DO SISTEMA)
 * Usado pelo painel administrativo para cobrar assinaturas dos tenants
 */
class IntegrationController {
  /**
   * Retorna o status das integrações configuradas
   */
  async status(req, res) {
    try {
      const efiConfigured = !!(
        integrationsConfig.efi.client_id &&
        integrationsConfig.efi.client_secret &&
        integrationsConfig.efi.certificate
      );

      const zapiConfigured = !!(
        integrationsConfig.zapi.instance &&
        integrationsConfig.zapi.token &&
        integrationsConfig.zapi.client_token
      );

      return res.json({
        efi: {
          configured: efiConfigured,
          sandbox: integrationsConfig.efi.sandbox,
          has_pix_key: !!integrationsConfig.efi.pix_key,
        },
        zapi: {
          configured: zapiConfigured,
          instance: zapiConfigured ? integrationsConfig.zapi.instance : null,
        },
        notifications: integrationsConfig.notifications,
      });
    } catch (error) {
      logger.error('Erro ao verificar status das integrações:', error);
      return res.status(500).json({ error: 'Erro ao verificar status' });
    }
  }

  /**
   * Testa a conexão com EFI
   */
  async testEfi(req, res) {
    try {
      if (!integrationsConfig.efi.client_id) {
        return res.status(400).json({
          success: false,
          error: 'Credenciais EFI não configuradas no arquivo .env',
        });
      }

      const efi = new EfiService({
        client_id: integrationsConfig.efi.client_id,
        client_secret: integrationsConfig.efi.client_secret,
        certificate: integrationsConfig.efi.certificate,
        sandbox: integrationsConfig.efi.sandbox,
      });

      const token = await efi.authenticate();

      return res.json({
        success: true,
        message: 'Credenciais EFI válidas e funcionando',
        sandbox: integrationsConfig.efi.sandbox,
        authenticated: !!token,
      });
    } catch (error) {
      logger.error('Erro ao testar EFI:', error);
      return res.status(400).json({
        success: false,
        error: 'Falha ao autenticar com as credenciais EFI',
        details: error.message,
      });
    }
  }

  /**
   * Testa a conexão com Z-API
   */
  async testZapi(req, res) {
    try {
      if (!integrationsConfig.zapi.instance) {
        return res.status(400).json({
          success: false,
          error: 'Credenciais Z-API não configuradas no arquivo .env',
        });
      }

      const zapi = new ZApiService({
        instance: integrationsConfig.zapi.instance,
        token: integrationsConfig.zapi.token,
        client_token: integrationsConfig.zapi.client_token,
      });

      const status = await zapi.getStatus();

      return res.json({
        success: true,
        message: 'Credenciais Z-API válidas e funcionando',
        instance: integrationsConfig.zapi.instance,
        status: status,
      });
    } catch (error) {
      logger.error('Erro ao testar Z-API:', error);
      return res.status(400).json({
        success: false,
        error: 'Falha ao conectar com Z-API',
        details: error.message,
      });
    }
  }

  /**
   * Envia mensagem de teste via WhatsApp
   */
  async sendTestMessage(req, res) {
    try {
      const { phone, message } = req.body;

      if (!integrationsConfig.zapi.instance) {
        return res.status(400).json({
          error: 'Z-API não configurada',
        });
      }

      if (!phone) {
        return res.status(400).json({
          error: 'Número de telefone é obrigatório',
        });
      }

      const zapi = new ZApiService({
        instance: integrationsConfig.zapi.instance,
        token: integrationsConfig.zapi.token,
        client_token: integrationsConfig.zapi.client_token,
      });

      const testMessage =
        message ||
        '🧪 Mensagem de teste da integração Z-API do MK-Edge Admin!\n\n' +
        'Se você recebeu esta mensagem, a integração está funcionando perfeitamente! ✅';

      await zapi.sendText(phone, testMessage);

      return res.json({
        success: true,
        message: 'Mensagem de teste enviada com sucesso',
        phone: phone,
      });
    } catch (error) {
      logger.error('Erro ao enviar mensagem de teste:', error);
      return res.status(400).json({
        success: false,
        error: 'Falha ao enviar mensagem',
        details: error.message,
      });
    }
  }
}

export default new IntegrationController();
