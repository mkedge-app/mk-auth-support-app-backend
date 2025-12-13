import Subscription from '../schemas/Subscription';
import Tenant from '../schemas/Tenant';
import EfiSubscriptionService from '../services/EfiSubscriptionService';

class SubscriptionController {
  /**
   * Criar nova assinatura
   * POST /subscription/create
   */
  async create(req, res) {
    try {
      const {
        tenant_id,
        plan_id,
        customer_name,
        customer_email,
        customer_cpf,
        customer_phone,
        customer_birth,
        customer_address,
        payment_method, // 'banking_billet' ou 'pix'
      } = req.body;

      console.log('📝 Criando assinatura para:', customer_email);

      // Buscar tenant
      const tenant = await Tenant.findById(tenant_id);
      if (!tenant) {
        return res.status(404).json({ error: 'Provedor não encontrado' });
      }

      // Clientes em cortesia não precisam de assinatura
      if (tenant.cortesia) {
        console.log('ℹ️ Cliente em cortesia - assinatura não necessária:', tenant_id);
        return res.status(200).json({
          message: 'Cliente em cortesia - serviço já ativo',
          tenant_id,
          cortesia: true,
          status: 'active',
        });
      }

      // Criar cobrança na EFI
      const charge = await EfiSubscriptionService.createCharge({
        item_name: `Assinatura MK-Edge - ${tenant.responsavel}`,
        value: 100.00, // R$ 100,00
        custom_id: tenant_id,
        notification_url: `${process.env.APP_URL || 'https://mk-edge.com.br'}/webhook/efi`,
      });

      const charge_id = charge.data.charge_id;

      let payment_data = null;

      // Gerar boleto ou PIX
      if (payment_method === 'banking_billet') {
        const boleto = await EfiSubscriptionService.generateBankingBillet(charge_id, {
          expire_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 dias
          customer: {
            name: customer_name,
            email: customer_email,
            cpf: customer_cpf,
            phone: customer_phone,
            birth: customer_birth,
            address: customer_address,
          },
        });

        payment_data = {
          barcode: boleto.data.barcode,
          link: boleto.data.link,
          pdf_link: boleto.data.pdf.charge,
        };
      } else if (payment_method === 'pix') {
        const pix = await EfiSubscriptionService.generatePixCharge({
          value: 100.00,
          customer: {
            name: customer_name,
            cpf: customer_cpf,
          },
          custom_id: tenant_id,
          description: `Assinatura MK-Edge - ${tenant.responsavel}`,
        });

        // Gerar QR Code
        const qrcode = await EfiSubscriptionService.generatePixQRCode(pix.loc.id);

        payment_data = {
          txid: pix.txid,
          qrcode: pix.pixCopiaECola,
          qrcode_image: qrcode.imagemQrcode,
        };
      }

      // Salvar assinatura no MongoDB
      const subscription = await Subscription.create({
        tenant_id,
        plan: plan_id || 'monthly',
        amount: 100.00,
        status: 'pending',
        payment_method,
        efi_charge_id: charge_id,
        payment_data,
        customer: {
          name: customer_name,
          email: customer_email,
          cpf: customer_cpf,
          phone: customer_phone,
        },
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
      });

      console.log('✅ Assinatura criada:', subscription._id);

      return res.json({
        success: true,
        subscription: {
          id: subscription._id,
          status: subscription.status,
          amount: subscription.amount,
          payment_method: subscription.payment_method,
          payment_data: subscription.payment_data,
        },
      });
    } catch (error) {
      console.error('❌ Erro ao criar assinatura:', error);
      return res.status(500).json({
        error: 'Erro ao criar assinatura',
        details: error.message,
      });
    }
  }

  /**
   * Consultar assinatura
   * GET /subscription/:id
   */
  async show(req, res) {
    try {
      const { id } = req.params;

      const subscription = await Subscription.findById(id).populate('tenant_id');

      if (!subscription) {
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }

      return res.json(subscription);
    } catch (error) {
      console.error('❌ Erro ao consultar assinatura:', error);
      return res.status(500).json({
        error: 'Erro ao consultar assinatura',
        details: error.message,
      });
    }
  }

  /**
   * Listar assinaturas do tenant
   * GET /subscription/tenant/:tenant_id
   */
  async listByTenant(req, res) {
    try {
      const { tenant_id } = req.params;

      const subscriptions = await Subscription.find({ tenant_id }).sort({ createdAt: -1 });

      return res.json(subscriptions);
    } catch (error) {
      console.error('❌ Erro ao listar assinaturas:', error);
      return res.status(500).json({
        error: 'Erro ao listar assinaturas',
        details: error.message,
      });
    }
  }

  /**
   * Cancelar assinatura
   * POST /subscription/:id/cancel
   */
  async cancel(req, res) {
    try {
      const { id } = req.params;

      const subscription = await Subscription.findById(id);

      if (!subscription) {
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }

      // Cancelar na EFI se houver subscription_id
      if (subscription.efi_subscription_id) {
        await EfiSubscriptionService.cancelSubscription(subscription.efi_subscription_id);
      }

      // Atualizar status
      subscription.status = 'cancelled';
      subscription.cancelled_at = new Date();
      await subscription.save();

      console.log('✅ Assinatura cancelada:', id);

      return res.json({
        success: true,
        message: 'Assinatura cancelada com sucesso',
        subscription,
      });
    } catch (error) {
      console.error('❌ Erro ao cancelar assinatura:', error);
      return res.status(500).json({
        error: 'Erro ao cancelar assinatura',
        details: error.message,
      });
    }
  }
}

export default new SubscriptionController();
