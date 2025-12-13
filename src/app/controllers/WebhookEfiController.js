import Subscription from '../schemas/Subscription';
import Tenant from '../schemas/Tenant';
import NotificationService from '../services/NotificationService';
import crypto from 'crypto';

class WebhookEfiController {
  /**
   * Receber notificações da EFI
   * POST /webhook/efi
   */
  async notification(req, res) {
    try {
      const notification = req.body;
      
      console.log('🔔 Webhook EFI recebido:', JSON.stringify(notification, null, 2));

      // Validar token de segurança (se configurado)
      const token = req.query.token || req.headers['x-webhook-token'];
      if (process.env.WEBHOOK_SECRET && token !== process.env.WEBHOOK_SECRET) {
        console.log('❌ Token de webhook inválido');
        return res.status(401).json({ error: 'Token inválido' });
      }

      // Processar notificação
      if (notification.event === 'charge.paid') {
        await this.handleChargePaid(notification.data);
      } else if (notification.event === 'charge.canceled') {
        await this.handleChargeCanceled(notification.data);
      } else if (notification.event === 'subscription.created') {
        await this.handleSubscriptionCreated(notification.data);
      } else if (notification.event === 'subscription.canceled') {
        await this.handleSubscriptionCanceled(notification.data);
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error('❌ Erro ao processar webhook:', error);
      return res.status(500).json({ error: 'Erro ao processar webhook' });
    }
  }

  /**
   * Processar pagamento confirmado
   */
  async handleChargePaid(data) {
    try {
      console.log('💰 Processando pagamento confirmado:', data.charge_id);

      // Buscar assinatura pela charge_id
      const subscription = await Subscription.findOne({
        efi_charge_id: data.charge_id,
      });

      if (!subscription) {
        console.log('⚠️ Assinatura não encontrada para charge_id:', data.charge_id);
        return;
      }

      // Atualizar status da assinatura
      subscription.status = 'active';
      subscription.paid_at = new Date();
      subscription.payment_data = {
        ...subscription.payment_data,
        paid: true,
        paid_value: data.value / 100, // Converter de centavos
        paid_at: new Date(),
      };

      await subscription.save();

      // Atualizar tenant (sem alterar status se estiver em cortesia)
      const tenant = await Tenant.findById(subscription.tenant_id);
      if (tenant) {
        tenant.subscription_status = 'active';
        tenant.subscription_paid_at = new Date();
        
        // Ativar apenas se não estiver em cortesia
        if (!tenant.cortesia && tenant.status !== 'ativo') {
          tenant.status = 'ativo';
          console.log('✅ Tenant ativado pelo pagamento:', tenant._id);
        } else if (tenant.cortesia) {
          console.log('ℹ️ Tenant em cortesia - status mantido:', tenant._id);
        }
        
        await tenant.save();
      }

      console.log('✅ Assinatura ativada:', subscription._id);

      // Enviar notificação de confirmação
      if (tenant) {
        try {
          await NotificationService.sendConfirmation(subscription, tenant, {
            charge_id: data.charge_id
          });
          console.log('✅ Notificação de confirmação enviada');
        } catch (notifError) {
          console.error('❌ Erro ao enviar notificação:', notifError);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao processar pagamento:', error);
    }
  }

  /**
   * Processar cobrança cancelada
   */
  async handleChargeCanceled(data) {
    try {
      console.log('❌ Processando cobrança cancelada:', data.charge_id);

      const subscription = await Subscription.findOne({
        efi_charge_id: data.charge_id,
      });

      if (!subscription) {
        return;
      }

      subscription.status = 'cancelled';
      subscription.cancelled_at = new Date();
      await subscription.save();

      console.log('✅ Assinatura cancelada:', subscription._id);
    } catch (error) {
      console.error('❌ Erro ao processar cancelamento:', error);
    }
  }

  /**
   * Processar assinatura recorrente criada
   */
  async handleSubscriptionCreated(data) {
    try {
      console.log('🆕 Processando assinatura recorrente criada:', data.subscription_id);

      const subscription = await Subscription.findOne({
        'customer.email': data.customer.email,
      }).sort({ createdAt: -1 });

      if (subscription) {
        subscription.efi_subscription_id = data.subscription_id;
        await subscription.save();
        console.log('✅ subscription_id vinculado:', subscription._id);
      }
    } catch (error) {
      console.error('❌ Erro ao processar criação de assinatura:', error);
    }
  }

  /**
   * Processar assinatura recorrente cancelada
   */
  async handleSubscriptionCanceled(data) {
    try {
      console.log('❌ Processando assinatura recorrente cancelada:', data.subscription_id);

      const subscription = await Subscription.findOne({
        efi_subscription_id: data.subscription_id,
      });

      if (!subscription) {
        return;
      }

      subscription.status = 'cancelled';
      subscription.cancelled_at = new Date();
      await subscription.save();

      // Suspender tenant apenas se NÃO estiver em cortesia
      const tenant = await Tenant.findById(subscription.tenant_id);
      if (tenant) {
        tenant.subscription_status = 'cancelled';
        
        // Suspender apenas se não estiver em cortesia
        if (!tenant.cortesia) {
          tenant.status = 'suspenso';
          console.log('⚠️ Tenant suspenso por cancelamento:', tenant._id);
        } else {
          console.log('ℹ️ Tenant em cortesia - mantido ativo apesar do cancelamento:', tenant._id);
        }
        
        await tenant.save();
      }

      console.log('✅ Assinatura cancelada:', subscription._id);
    } catch (error) {
      console.error('❌ Erro ao processar cancelamento de assinatura:', error);
    }
  }
}

export default new WebhookEfiController();
