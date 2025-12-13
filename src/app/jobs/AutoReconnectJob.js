import cron from 'node-cron';
import Tenant from '../schemas/Tenant';
import logger from '../../logger';

class AutoReconnectJob {
  constructor() {
    this.job = null;
  }

  /**
   * Reconecta automaticamente os bancos dos tenants elegíveis
   */
  async reconnectEligibleTenants() {
    try {
      logger.info('🔄 [AutoReconnect] Iniciando reconexão automática de tenants...');

      // Buscar tenants elegíveis: cortesia OU com pagamento em dia
      const eligibleTenants = await Tenant.find({
        $or: [
          { cortesia: true }, // Clientes cortesia sempre conectam
          {
            status: 'ativo',
            'assinatura.status': { $in: ['active', 'trialing'] },
            'assinatura.ativa': true
          }
        ]
      }).select('_id provedor.nome razao_social cnpj cortesia status assinatura.status database');

      if (eligibleTenants.length === 0) {
        logger.info('🔄 [AutoReconnect] Nenhum tenant elegível encontrado');
        return;
      }

      logger.info(`🔄 [AutoReconnect] Encontrados ${eligibleTenants.length} tenants elegíveis para reconexão`);

      let reconnected = 0;
      let failed = 0;

      for (const tenant of eligibleTenants) {
        try {
          const tenantName = tenant.provedor?.nome || tenant.razao_social || tenant.cnpj;
          const isCortesia = tenant.cortesia === true;

          // Verificar se tem dados de conexão
          if (!tenant.database || !tenant.database.host) {
            logger.warn(`⚠️  [AutoReconnect] ${tenantName} não possui dados de conexão`);
            continue;
          }

          // Tentar conectar ao banco
          const Sequelize = require('sequelize');
          const sequelize = new Sequelize(
            tenant.database.name,
            tenant.database.username,
            tenant.database.password,
            {
              host: tenant.database.host,
              dialect: tenant.database.dialect || 'mysql',
              port: tenant.database.port || 3306,
              logging: false,
              pool: {
                max: 5,
                min: 0,
                acquire: 30000,
                idle: 10000
              }
            }
          );

          // Testar conexão
          await sequelize.authenticate();
          await sequelize.close();

          reconnected++;
          logger.info(
            `✅ [AutoReconnect] ${tenantName} conectado ${isCortesia ? '(CORTESIA)' : '(PAGAMENTO OK)'}`
          );

        } catch (error) {
          failed++;
          const tenantName = tenant.provedor?.nome || tenant.razao_social || tenant.cnpj;
          logger.error(`❌ [AutoReconnect] Erro ao conectar ${tenantName}: ${error.message}`);
        }
      }

      logger.info(
        `🔄 [AutoReconnect] Reconexão concluída: ${reconnected} sucesso, ${failed} falhas`
      );

    } catch (error) {
      logger.error(`❌ [AutoReconnect] Erro geral: ${error.message}`);
    }
  }

  /**
   * Executa reconexão imediatamente (ao iniciar servidor)
   */
  async runImmediately() {
    logger.info('🚀 [AutoReconnect] Executando reconexão inicial ao iniciar servidor...');
    await this.reconnectEligibleTenants();
  }

  /**
   * Inicia job agendado para verificar periodicamente
   * Executa a cada 1 hora
   */
  start() {
    // Executar imediatamente ao iniciar
    this.runImmediately();

    // Agendar para executar a cada 1 hora
    this.job = cron.schedule('0 * * * *', async () => {
      await this.reconnectEligibleTenants();
    });

    logger.info('✅ [AutoReconnect] Job iniciado - Reconexão automática a cada 1 hora');
  }

  /**
   * Para o job agendado
   */
  stop() {
    if (this.job) {
      this.job.stop();
      logger.info('🛑 [AutoReconnect] Job parado');
    }
  }
}

export default new AutoReconnectJob();
