import cron from 'node-cron';
import Subscription from '../schemas/Subscription';
import Tenant from '../schemas/Tenant';
import NotificationService from '../services/NotificationService';

class ReminderJob {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Inicia o cron job
   * Executa todos os dias às 9h da manhã
   */
  start() {
    console.log('📅 Job de lembretes iniciado');

    // Executar todos os dias às 9h
    cron.schedule('0 9 * * *', async () => {
      if (this.isRunning) {
        console.log('⏭️ Job já está executando, pulando...');
        return;
      }

      console.log('🔔 Executando job de lembretes...');
      this.isRunning = true;

      try {
        await this.sendReminders();
        await this.sendTrialReminders();
      } catch (error) {
        console.error('❌ Erro no job de lembretes:', error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log('✅ Job agendado para executar diariamente às 9h');
  }

  /**
   * Envia lembretes para assinaturas próximas do vencimento
   */
  async sendReminders() {
    try {
      const hoje = new Date();
      const daqui3Dias = new Date();
      daqui3Dias.setDate(hoje.getDate() + 3);
      daqui3Dias.setHours(0, 0, 0, 0);

      const daqui4Dias = new Date();
      daqui4Dias.setDate(hoje.getDate() + 4);
      daqui4Dias.setHours(0, 0, 0, 0);

      console.log(`📅 Buscando assinaturas que vencem em 3 dias...`);
      console.log(`Data alvo: ${daqui3Dias.toLocaleDateString('pt-BR')}`);

      // Buscar assinaturas ativas que vencem em 3 dias
      const subscriptions = await Subscription.find({
        status: 'active',
        next_due_date: {
          $gte: daqui3Dias,
          $lt: daqui4Dias
        }
      });

      console.log(`📊 Encontradas ${subscriptions.length} assinaturas`);

      if (subscriptions.length === 0) {
        console.log('ℹ️ Nenhuma assinatura encontrada para enviar lembrete');
        return;
      }

      let enviados = 0;
      let erros = 0;

      for (const subscription of subscriptions) {
        try {
          // Buscar tenant
          const tenant = await Tenant.findById(subscription.tenant_id);
          
          if (!tenant) {
            console.log(`⚠️ Tenant não encontrado: ${subscription.tenant_id}`);
            continue;
          }

          // Pular se tenant estiver em cortesia
          if (tenant.cortesia) {
            console.log(`ℹ️ Tenant em cortesia, pulando: ${tenant.nome_fantasia || tenant._id}`);
            continue;
          }

          // Verificar se tenant tem WhatsApp habilitado
          if (!tenant.notificacoes?.whatsapp_enabled) {
            console.log(`ℹ️ WhatsApp desabilitado para: ${tenant.nome_fantasia || tenant._id}`);
            continue;
          }

          // Enviar lembrete
          const result = await NotificationService.sendReminder(subscription, tenant);
          
          if (result.success) {
            enviados++;
            console.log(`✅ Lembrete enviado: ${tenant.nome_fantasia || tenant._id}`);
          } else {
            erros++;
            console.log(`❌ Erro ao enviar para ${tenant.nome_fantasia || tenant._id}:`, result.error);
          }

        } catch (error) {
          erros++;
          console.error(`❌ Erro ao processar subscription ${subscription._id}:`, error);
        }
      }

      console.log('📊 Resumo do envio de lembretes:');
      console.log(`  ✅ Enviados: ${enviados}`);
      console.log(`  ❌ Erros: ${erros}`);
      console.log(`  📋 Total processado: ${subscriptions.length}`);

    } catch (error) {
      console.error('❌ Erro ao enviar lembretes:', error);
      throw error;
    }
  }

  /**
   * Envia lembretes para trials que estão próximos de expirar (3 dias antes)
   */
  async sendTrialReminders() {
    try {
      const hoje = new Date();
      const daqui3Dias = new Date();
      daqui3Dias.setDate(hoje.getDate() + 3);
      daqui3Dias.setHours(0, 0, 0, 0);

      const daqui4Dias = new Date();
      daqui4Dias.setDate(hoje.getDate() + 4);
      daqui4Dias.setHours(0, 0, 0, 0);

      console.log(`📅 Buscando trials que expiram em 3 dias...`);

      // Buscar subscriptions em trial que expiram em 3 dias
      const subscriptions = await Subscription.find({
        status: 'trial',
        trial_end: {
          $gte: daqui3Dias,
          $lt: daqui4Dias
        }
      });

      console.log(`📊 Encontradas ${subscriptions.length} trials expirando em 3 dias`);

      if (subscriptions.length === 0) {
        console.log('ℹ️ Nenhum trial expirando em 3 dias');
        return;
      }

      let enviados = 0;
      let erros = 0;

      for (const subscription of subscriptions) {
        try {
          const tenant = await Tenant.findById(subscription.tenant_id);
          
          if (!tenant) {
            console.log(`⚠️ Tenant não encontrado: ${subscription.tenant_id}`);
            continue;
          }

          // Pular se tenant estiver em cortesia
          if (tenant.cortesia) {
            console.log(`ℹ️ Tenant em cortesia, pulando: ${tenant.nome_fantasia || tenant._id}`);
            continue;
          }

          // Verificar se WhatsApp está habilitado
          if (!tenant.notificacoes?.whatsapp_enabled) {
            console.log(`ℹ️ WhatsApp desabilitado para: ${tenant.nome_fantasia || tenant._id}`);
            continue;
          }

          // Enviar lembrete de trial expirando
          const result = await NotificationService.sendNotification({
            tenant_id: tenant._id,
            template_type: 'reminder',
            channel: 'whatsapp',
            recipient: tenant.telefone || tenant.celular || tenant.contato,
            recipient_name: tenant.nome_fantasia || tenant.razao_social || tenant.provedor?.nome,
            variables: {
              nome: tenant.nome_fantasia || tenant.razao_social || tenant.provedor?.nome,
              valor: `R$ ${(subscription.valor / 100).toFixed(2)}`,
              vencimento: new Date(subscription.trial_end).toLocaleDateString('pt-BR'),
              dias: '3'
            },
            metadata: {
              subscription_id: subscription._id,
              invoice_amount: subscription.valor,
              due_date: subscription.trial_end
            }
          });

          if (result.success) {
            enviados++;
            console.log(`✅ Lembrete de trial enviado: ${tenant.nome_fantasia || tenant._id}`);
          } else {
            erros++;
            console.log(`❌ Erro ao enviar para ${tenant.nome_fantasia || tenant._id}:`, result.error);
          }

        } catch (error) {
          erros++;
          console.error(`❌ Erro ao processar trial ${subscription._id}:`, error);
        }
      }

      console.log('📊 Resumo dos lembretes de trial:');
      console.log(`  ✅ Enviados: ${enviados}`);
      console.log(`  ❌ Erros: ${erros}`);
      console.log(`  📋 Total processado: ${subscriptions.length}`);

    } catch (error) {
      console.error('❌ Erro ao enviar lembretes de trial:', error);
    }
  }

  /**
   * Executa imediatamente (para testes)
   */
  async runNow() {
    console.log('🚀 Executando job de lembretes imediatamente...');
    this.isRunning = true;

    try {
      await this.sendReminders();
    } catch (error) {
      console.error('❌ Erro ao executar job:', error);
    } finally {
      this.isRunning = false;
    }
  }
}

export default new ReminderJob();
