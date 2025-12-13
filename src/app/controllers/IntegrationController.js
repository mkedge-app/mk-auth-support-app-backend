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

  /**
   * Atualiza configurações de integração (atualiza arquivo .env)
   * NOTA: Requer reinicialização do servidor para aplicar mudanças
   */
  async updateConfig(req, res) {
    try {
      const { type, config } = req.body;
      const fs = require('fs');
      const path = require('path');
      const envPath = path.resolve(process.cwd(), '.env');

      if (!['efi', 'zapi'].includes(type)) {
        return res.status(400).json({
          error: 'Tipo de integração inválido. Use "efi" ou "zapi"',
        });
      }

      // Lê o arquivo .env
      let envContent = fs.readFileSync(envPath, 'utf8');

      if (type === 'efi') {
        // Atualiza variáveis EFI
        if (config.client_id) {
          envContent = envContent.replace(
            /EFI_CLIENT_ID=.*/,
            `EFI_CLIENT_ID=${config.client_id}`
          );
        }
        if (config.client_secret) {
          envContent = envContent.replace(
            /EFI_CLIENT_SECRET=.*/,
            `EFI_CLIENT_SECRET=${config.client_secret}`
          );
        }
        if (config.pix_key !== undefined) {
          envContent = envContent.replace(
            /EFI_PIX_KEY=.*/,
            `EFI_PIX_KEY=${config.pix_key || ''}`
          );
        }
        if (config.sandbox !== undefined) {
          envContent = envContent.replace(
            /EFI_SANDBOX=.*/,
            `EFI_SANDBOX=${config.sandbox}`
          );
        }
      } else if (type === 'zapi') {
        // Atualiza variáveis Z-API
        if (config.instance) {
          envContent = envContent.replace(
            /ZAPI_INSTANCE=.*/,
            `ZAPI_INSTANCE=${config.instance}`
          );
        }
        if (config.token) {
          envContent = envContent.replace(
            /ZAPI_TOKEN=.*/,
            `ZAPI_TOKEN=${config.token}`
          );
        }
        if (config.security_token !== undefined) {
          envContent = envContent.replace(
            /ZAPI_CLIENT_TOKEN=.*/,
            `ZAPI_CLIENT_TOKEN=${config.security_token || ''}`
          );
        }
      }

      // Salva o arquivo .env
      fs.writeFileSync(envPath, envContent, 'utf8');

      logger.info(`Configurações de ${type.toUpperCase()} atualizadas no .env`);

      return res.json({
        success: true,
        message: 'Configurações salvas com sucesso. Reinicie o servidor para aplicar as mudanças.',
        requires_restart: true,
      });
    } catch (error) {
      logger.error('Erro ao atualizar configurações:', error);
      return res.status(500).json({
        error: 'Erro ao salvar configurações',
        details: error.message,
      });
    }
  }
}

export default new IntegrationController();
