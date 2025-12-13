import cron from 'node-cron';
import Subscription from '../schemas/Subscription';
import Tenant from '../schemas/Tenant';
import NotificationService from '../services/NotificationService';
import EfiSubscriptionService from '../services/EfiSubscriptionService';

class TrialExpirationJob {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Inicia o cron job
   * Executa todos os dias às 8h da manhã
   */
  start() {
    console.log('📅 Job de expiração de trial iniciado');

    // Executar todos os dias às 8h
    cron.schedule('0 8 * * *', async () => {
      if (this.isRunning) {
        console.log('⏭️ Job já está executando, pulando...');
        return;
      }

      console.log('🔔 Executando job de expiração de trial...');
      this.isRunning = true;

      try {
        await this.checkExpiredTrials();
      } catch (error) {
        console.error('❌ Erro no job de trial:', error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log('✅ Job agendado para executar diariamente às 8h');
  }

  /**
   * Verifica trials expirados e cria cobranças
   */
  async checkExpiredTrials() {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const amanha = new Date();
      amanha.setDate(hoje.getDate() + 1);
      amanha.setHours(0, 0, 0, 0);

      console.log(`📅 Buscando trials que expiraram hoje...`);
      console.log(`Data: ${hoje.toLocaleDateString('pt-BR')}`);

      // Buscar subscriptions em trial que expiram hoje
      const subscriptions = await Subscription.find({
        status: 'trial',
        trial_end: {
          $gte: hoje,
          $lt: amanha
        }
      });

      console.log(`📊 Encontradas ${subscriptions.length} trials expirando`);

      if (subscriptions.length === 0) {
        console.log('ℹ️ Nenhum trial expirando hoje');
        return;
      }

      let cobrados = 0;
      let erros = 0;
      let cortesia = 0;

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
            cortesia++;
            
            // Atualizar para ativo sem cobrança
            subscription.status = 'active';
            tenant.status = 'ativo';
            tenant.subscription_status = 'active';
            await subscription.save();
            await tenant.save();
            
            continue;
          }

          console.log(`💰 Criando cobrança para: ${tenant.nome_fantasia || tenant.provedor?.nome}`);

          // Criar cobrança na EFI
          const charge = await EfiSubscriptionService.createCharge({
            tenant_id: tenant._id,
            plano_id: subscription.plano_id,
            valor: subscription.valor,
            vencimento: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 dias
          });

          if (!charge.success) {
            throw new Error(charge.error || 'Erro ao criar cobrança');
          }

          // Gerar PIX e Boleto
          const [pixResult, boletoResult] = await Promise.all([
            EfiSubscriptionService.generatePix(charge.data.charge_id),
            EfiSubscriptionService.generateBoleto(charge.data.charge_id)
          ]);

          // Atualizar subscription
          subscription.status = 'pending_payment';
          subscription.efi_charge_id = charge.data.charge_id;
          subscription.payment_data = {
            charge_id: charge.data.charge_id,
            pix: pixResult.success ? {
              qrcode: pixResult.data.qrcode,
              qrcode_image: pixResult.data.qrcode_image,
              copy_paste: pixResult.data.copy_paste
            } : null,
            boleto: boletoResult.success ? {
              barcode: boletoResult.data.barcode,
              link: boletoResult.data.link,
              pdf: boletoResult.data.pdf
            } : null
          };

          await subscription.save();

          // Atualizar tenant
          tenant.status = 'pendente_pagamento';
          tenant.subscription_status = 'pending_payment';
          await tenant.save();

          // Enviar notificação com link de pagamento
          const paymentLink = `http://mk-edge.com.br/portal?pagamento=${charge.data.charge_id}`;
          
          await NotificationService.sendNotification({
            tenant_id: tenant._id,
            template_type: 'reminder', // Usar template de lembrete
            channel: 'whatsapp',
            recipient: tenant.telefone || tenant.celular || tenant.contato,
            recipient_name: tenant.nome_fantasia || tenant.razao_social || tenant.provedor?.nome,
            variables: {
              nome: tenant.nome_fantasia || tenant.razao_social || tenant.provedor?.nome,
              valor: `R$ ${(subscription.valor / 100).toFixed(2)}`,
              vencimento: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
              dias: '5',
              link_pagamento: paymentLink
            },
            metadata: {
              subscription_id: subscription._id,
              charge_id: charge.data.charge_id,
              invoice_amount: subscription.valor,
              payment_link: paymentLink
            }
          });

          cobrados++;
          console.log(`✅ Cobrança criada: ${tenant.nome_fantasia || tenant._id}`);

        } catch (error) {
          erros++;
          console.error(`❌ Erro ao processar subscription ${subscription._id}:`, error);
        }
      }

      console.log('📊 Resumo da expiração de trials:');
      console.log(`  💰 Cobrados: ${cobrados}`);
      console.log(`  🎁 Cortesia: ${cortesia}`);
      console.log(`  ❌ Erros: ${erros}`);
      console.log(`  📋 Total processado: ${subscriptions.length}`);

    } catch (error) {
      console.error('❌ Erro ao verificar trials expirados:', error);
      throw error;
    }
  }

  /**
   * Verifica trials que estão próximos de expirar (3 dias antes)
   */
  async sendTrialExpiringReminders() {
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

      let enviados = 0;
      let erros = 0;

      for (const subscription of subscriptions) {
        try {
          const tenant = await Tenant.findById(subscription.tenant_id);
          
          if (!tenant || tenant.cortesia) continue;
          if (!tenant.notificacoes?.whatsapp_enabled) continue;

          // Enviar lembrete de trial expirando
          await NotificationService.sendNotification({
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
            }
          });

          enviados++;
          console.log(`✅ Lembrete de trial enviado: ${tenant.nome_fantasia || tenant._id}`);

        } catch (error) {
          erros++;
          console.error(`❌ Erro ao enviar lembrete:`, error);
        }
      }

      console.log(`📊 Lembretes trial: ${enviados} enviados, ${erros} erros`);

    } catch (error) {
      console.error('❌ Erro ao enviar lembretes de trial:', error);
    }
  }

  /**
   * Executa imediatamente (para testes)
   */
  async runNow() {
    console.log('🚀 Executando job de trial imediatamente...');
    this.isRunning = true;

    try {
      await this.checkExpiredTrials();
    } catch (error) {
      console.error('❌ Erro ao executar job:', error);
    } finally {
      this.isRunning = false;
    }
  }
}

export default new TrialExpirationJob();
