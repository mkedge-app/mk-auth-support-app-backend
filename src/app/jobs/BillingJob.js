import { format, addDays, differenceInDays, isPast, isSameDay } from 'date-fns';
import Subscription from '../schemas/Subscription';
import Invoice from '../schemas/Invoice';
import Tenant from '../schemas/Tenant';
import ZApiService from '../helpers/ZApiService';
import integrationsConfig from '../../config/integrations';
import logger from '../../logger';

/**
 * Job de cobrança automática
 * Executa diariamente para:
 * - Gerar faturas próximas ao vencimento
 * - Enviar lembretes de vencimento
 * - Suspender assinaturas vencidas
 * - Enviar avisos de suspensão
 */
class BillingJob {
  async handle() {
    logger.info('🔄 Iniciando job de cobrança automática...');

    try {
      await this.checkTrialExpiring(); // Novo: Verifica trials expirando (dia 7)
      await this.blockExpiredTrials(); // Novo: Bloqueia trials não pagos (dia 8+)
      await this.generateUpcomingInvoices();
      await this.sendPaymentReminders();
      await this.suspendOverdueSubscriptions();
      await this.sendOverdueNotifications();

      logger.info('✅ Job de cobrança concluído com sucesso');
    } catch (error) {
      logger.error('❌ Erro no job de cobrança:', error);
    }
  }

  /**
   * Verifica trials que expiram hoje (dia 7) e envia aviso
   */
  async checkTrialExpiring() {
    try {
      logger.info('⏰ Verificando trials expirando hoje...');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = addDays(today, 1);
      tomorrow.setHours(0, 0, 0, 0);

      // Busca assinaturas trial que expiram hoje
      const expiringTrials = await Subscription.find({
        status: 'trial',
        trial_end: {
          $gte: today,
          $lt: tomorrow
        }
      }).populate('tenant_id');

      for (const subscription of expiringTrials) {
        const tenant = subscription.tenant_id;
        
        logger.info(`⚠️ Trial expirando: ${tenant.provedor.nome}`);

        // Envia aviso por WhatsApp (se configurado)
        if (integrationsConfig.zapi.instance && integrationsConfig.notifications.whatsapp_enabled) {
          try {
            const zapi = new ZApiService({
              instance: integrationsConfig.zapi.instance,
              token: integrationsConfig.zapi.token,
              client_token: integrationsConfig.zapi.client_token,
            });

            await zapi.sendText(
              tenant.contato,
              `⚠️ *Período de teste terminando hoje!*\n\n` +
              `Olá *${tenant.responsavel}*,\n\n` +
              `Seu período de teste de 7 dias termina *hoje*!\n\n` +
              `Para continuar utilizando o sistema, efetue o pagamento de *R$ ${subscription.valor.toFixed(2)}*.\n\n` +
              `*Sem o pagamento, o acesso será bloqueado automaticamente amanhã.*\n\n` +
              `Dúvidas? Entre em contato conosco!`
            );

            logger.info(`✅ Aviso de trial enviado para ${tenant.provedor.nome}`);
          } catch (error) {
            logger.error(`❌ Erro ao enviar aviso de trial:`, error);
          }
        }

        // Atualizar status para trial_expiring
        subscription.status = 'trial_expiring';
        await subscription.save();

        tenant.assinatura.status = 'trial_expiring';
        tenant.status = 'trial_expiring';
        await tenant.save();
      }

      logger.info(`✅ ${expiringTrials.length} trial(s) verificado(s)`);
    } catch (error) {
      logger.error('❌ Erro ao verificar trials expirando:', error);
    }
  }

  /**
   * Bloqueia assinaturas trial expiradas sem pagamento (dia 8+)
   */
  async blockExpiredTrials() {
    try {
      logger.info('🚫 Bloqueando trials expirados...');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Busca assinaturas trial que já expiraram
      const expiredTrials = await Subscription.find({
        status: { $in: ['trial', 'trial_expiring'] },
        trial_end: {
          $lt: today
        }
      }).populate('tenant_id');

      for (const subscription of expiredTrials) {
        const tenant = subscription.tenant_id;
        
        logger.info(`🚫 Bloqueando trial expirado: ${tenant.provedor.nome}`);

        // Atualiza status para suspended
        subscription.status = 'suspended';
        await subscription.save();

        tenant.assinatura.status = 'suspended';
        tenant.assinatura.ativa = false;
        tenant.status = 'suspended';
        await tenant.save();

        // Envia notificação de bloqueio
        if (integrationsConfig.zapi.instance && integrationsConfig.notifications.whatsapp_enabled) {
          try {
            const zapi = new ZApiService({
              instance: integrationsConfig.zapi.instance,
              token: integrationsConfig.zapi.token,
              client_token: integrationsConfig.zapi.client_token,
            });

            await zapi.sendText(
              tenant.contato,
              `🚫 *Acesso bloqueado*\n\n` +
              `Olá *${tenant.responsavel}*,\n\n` +
              `Seu período de teste expirou e não identificamos o pagamento.\n\n` +
              `Seu acesso foi *bloqueado automaticamente*.\n\n` +
              `Para reativar, efetue o pagamento de *R$ ${subscription.valor.toFixed(2)}*.\n\n` +
              `Entre em contato para mais informações!`
            );

            logger.info(`✅ Notificação de bloqueio enviada para ${tenant.provedor.nome}`);
          } catch (error) {
            logger.error(`❌ Erro ao enviar notificação de bloqueio:`, error);
          }
        }
      }

      logger.info(`✅ ${expiredTrials.length} trial(s) bloqueado(s)`);
    } catch (error) {
      logger.error('❌ Erro ao bloquear trials expirados:', error);
    }
  }

  /**
   * Gera faturas para assinaturas que vencem nos próximos 5 dias
   */
  async generateUpcomingInvoices() {
    try {
      logger.info('📄 Gerando faturas...');

      const fiveDaysFromNow = addDays(new Date(), 5);

      const subscriptions = await Subscription.find({
        status: { $in: ['active', 'trial'] },
        proximo_vencimento: {
          $lte: fiveDaysFromNow,
        },
      }).populate('tenant_id');

      for (const subscription of subscriptions) {
        // Verifica se já existe fatura pendente para este vencimento
        const existingInvoice = await Invoice.findOne({
          subscription_id: subscription._id,
          data_vencimento: subscription.proximo_vencimento,
          status: { $in: ['pending', 'paid'] },
        });

        if (existingInvoice) {
          logger.info(`Fatura já existe para assinatura ${subscription._id}`);
          continue;
        }

        // Cria nova fatura
        const numero_fatura = `INV-${Date.now()}-${subscription._id.toString().substring(0, 8)}`;
        
        const invoice = await Invoice.create({
          tenant_id: subscription.tenant_id._id,
          subscription_id: subscription._id,
          numero_fatura,
          valor: subscription.valor,
          data_vencimento: subscription.proximo_vencimento,
          metodo_pagamento: subscription.metodo_pagamento || 'pix',
          status: 'pending',
          historico: [{
            evento: 'invoice_created',
            descricao: 'Fatura gerada automaticamente',
          }],
        });

        logger.info(`✅ Fatura ${numero_fatura} criada para tenant ${subscription.tenant_id.provedor.nome}`);
      }
    } catch (error) {
      logger.error('Erro ao gerar faturas:', error);
    }
  }

  /**
   * Envia lembretes de pagamento
   */
  async sendPaymentReminders() {
    try {
      logger.info('💬 Enviando lembretes de pagamento...');

      const now = new Date();

      // Busca faturas pendentes
      const invoices = await Invoice.find({
        status: 'pending',
        data_vencimento: {
          $gte: now,
        },
      }).populate('tenant_id');

      for (const invoice of invoices) {
        const tenant = invoice.tenant_id;
        
        if (!tenant.zapi_instance || !tenant.notificacoes.whatsapp_enabled) {
          continue;
        }

        const diasParaVencimento = differenceInDays(
          invoice.data_vencimento,
          now
        );

        // Verifica se deve enviar lembrete
        const diasAviso = tenant.notificacoes.dias_aviso_vencimento || [7, 3, 1];
        
        if (!diasAviso.includes(diasParaVencimento)) {
          continue;
        }

        // Verifica se já enviou lembrete hoje
        const lembretesHoje = invoice.notificacoes_enviadas.filter(notif => 
          notif.tipo === 'whatsapp' &&
          notif.mensagem.includes('Lembrete') &&
          isSameDay(notif.data_envio, now)
        );

        if (lembretesHoje.length > 0) {
          continue;
        }

        try {
          const zapi = new ZApiService({
            instance: integrationsConfig.zapi.instance,
            token: integrationsConfig.zapi.token,
            client_token: integrationsConfig.zapi.client_token,
          });

          // Gera link de pagamento (você pode personalizar isso)
          const linkPagamento = `${process.env.APP_URL}/pagamento/${invoice._id}`;

          await zapi.sendText(
            tenant.contato,
            zapi.templates.lembreteVencimento(
              tenant.responsavel,
              diasParaVencimento,
              invoice.valor,
              linkPagamento
            )
          );

          invoice.notificacoes_enviadas.push({
            tipo: 'whatsapp',
            status: 'sent',
            mensagem: `Lembrete de vencimento (${diasParaVencimento} dias)`,
          });
          await invoice.save();

          logger.info(`✅ Lembrete enviado para ${tenant.provedor.nome} (${diasParaVencimento} dias)`);
        } catch (error) {
          logger.error(`Erro ao enviar lembrete para ${tenant.provedor.nome}:`, error);
          
          invoice.notificacoes_enviadas.push({
            tipo: 'whatsapp',
            status: 'failed',
            mensagem: `Erro ao enviar lembrete: ${error.message}`,
          });
          await invoice.save();
        }
      }
    } catch (error) {
      logger.error('Erro ao enviar lembretes:', error);
    }
  }

  /**
   * Suspende assinaturas vencidas há mais de 3 dias
   */
  async suspendOverdueSubscriptions() {
    try {
      logger.info('⚠️ Verificando assinaturas vencidas...');

      const now = new Date();
      const threeDaysAgo = addDays(now, -3);

      // Busca faturas vencidas há mais de 3 dias
      const overdueInvoices = await Invoice.find({
        status: 'pending',
        data_vencimento: {
          $lte: threeDaysAgo,
        },
      }).populate('subscription_id tenant_id');

      for (const invoice of overdueInvoices) {
        const subscription = invoice.subscription_id;
        
        if (!subscription || subscription.status === 'suspended') {
          continue;
        }

        // Suspende a assinatura
        subscription.status = 'suspended';
        subscription.tentativas_falhas += 1;
        await subscription.save();

        // Atualiza tenant
        const tenant = invoice.tenant_id;
        tenant.assinatura.status = 'suspended';
        tenant.assinatura.ativa = false;
        tenant.assinatura.tentativas_falhas += 1;
        await tenant.save();

        // Atualiza fatura
        invoice.status = 'overdue';
        invoice.historico.push({
          evento: 'subscription_suspended',
          descricao: 'Assinatura suspensa por falta de pagamento',
        });
        await invoice.save();

        logger.info(`⚠️ Assinatura ${subscription._id} suspensa (Tenant: ${tenant.provedor.nome})`);
      }
    } catch (error) {
      logger.error('Erro ao suspender assinaturas:', error);
    }
  }

  /**
   * Envia notificações de faturas vencidas
   */
  async sendOverdueNotifications() {
    try {
      logger.info('📢 Enviando notificações de vencimento...');

      const now = new Date();

      // Busca faturas vencidas
      const overdueInvoices = await Invoice.find({
        status: { $in: ['pending', 'overdue'] },
        data_vencimento: {
          $lt: now,
        },
      }).populate('tenant_id');

      for (const invoice of overdueInvoices) {
        const tenant = invoice.tenant_id;
        
        if (!tenant.zapi_instance || !tenant.notificacoes.whatsapp_enabled) {
          continue;
        }

        const diasVencido = differenceInDays(
          now,
          invoice.data_vencimento
        );

        // Envia notificação nos dias 1, 3, 7 após vencimento
        if (![1, 3, 7].includes(diasVencido)) {
          continue;
        }

        // Verifica se já enviou notificação hoje
        const notifHoje = invoice.notificacoes_enviadas.filter(notif => 
          notif.tipo === 'whatsapp' &&
          notif.mensagem.includes('vencida') &&
          isSameDay(notif.data_envio, now)
        );

        if (notifHoje.length > 0) {
          continue;
        }

        try {
          const zapi = new ZApiService({
            instance: integrationsConfig.zapi.instance,
            token: integrationsConfig.zapi.token,
            client_token: integrationsConfig.zapi.client_token,
          });

          const linkPagamento = `${process.env.APP_URL}/pagamento/${invoice._id}`;

          await zapi.sendText(
            tenant.contato,
            zapi.templates.faturaVencida(
              tenant.responsavel,
              diasVencido,
              invoice.valor,
              linkPagamento
            )
          );

          invoice.notificacoes_enviadas.push({
            tipo: 'whatsapp',
            status: 'sent',
            mensagem: `Notificação de fatura vencida (${diasVencido} dias)`,
          });
          await invoice.save();

          logger.info(`✅ Notificação de vencimento enviada para ${tenant.provedor.nome}`);
        } catch (error) {
          logger.error(`Erro ao enviar notificação para ${tenant.provedor.nome}:`, error);
        }
      }
    } catch (error) {
      logger.error('Erro ao enviar notificações de vencimento:', error);
    }
  }
}

export default new BillingJob();
