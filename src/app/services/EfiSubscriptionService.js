import Gerencianet from 'gn-api-sdk-node';
import path from 'path';
import fs from 'fs';

class EfiSubscriptionService {
  constructor() {
    this.options = {
      client_id: process.env.EFI_CLIENT_ID,
      client_secret: process.env.EFI_CLIENT_SECRET,
      certificate: path.resolve(__dirname, '..', '..', '..', process.env.EFI_CERTIFICATE_PATH),
      sandbox: process.env.EFI_SANDBOX === 'true',
    };

    // Verificar se o certificado existe
    if (!fs.existsSync(this.options.certificate)) {
      console.error('❌ Certificado EFI não encontrado:', this.options.certificate);
    } else {
      console.log('✅ Certificado EFI carregado:', this.options.certificate);
    }
  }

  /**
   * Criar plano de assinatura recorrente
   */
  async createPlan(planData) {
    try {
      const gerencianet = new Gerencianet(this.options);

      const body = {
        name: planData.name,
        interval: planData.interval || 1, // 1 = mensal
        repeats: planData.repeats || null, // null = indefinido
      };

      const response = await gerencianet.createPlan({}, body);
      
      console.log('✅ Plano EFI criado:', response);
      return response;
    } catch (error) {
      console.error('❌ Erro ao criar plano EFI:', error);
      throw error;
    }
  }

  /**
   * Criar assinatura para um cliente
   */
  async createSubscription(subscriptionData) {
    try {
      const gerencianet = new Gerencianet(this.options);

      const body = {
        plan_id: subscriptionData.plan_id,
        items: [{
          name: subscriptionData.item_name,
          amount: 1,
          value: Math.round(subscriptionData.value * 100), // Valor em centavos
        }],
        customer: {
          name: subscriptionData.customer.name,
          email: subscriptionData.customer.email,
          cpf: subscriptionData.customer.cpf,
          phone_number: subscriptionData.customer.phone,
        },
        metadata: {
          custom_id: subscriptionData.custom_id || null,
          notification_url: subscriptionData.notification_url || null,
        },
      };

      const response = await gerencianet.createSubscription({}, body);
      
      console.log('✅ Assinatura EFI criada:', response);
      return response;
    } catch (error) {
      console.error('❌ Erro ao criar assinatura EFI:', error);
      throw error;
    }
  }

  /**
   * Criar cobrança (carnê) para assinatura
   */
  async createCharge(chargeData) {
    try {
      const gerencianet = new Gerencianet(this.options);

      const body = {
        items: [{
          name: chargeData.item_name,
          value: Math.round(chargeData.value * 100), // Centavos
          amount: 1,
        }],
        metadata: {
          custom_id: chargeData.custom_id,
          notification_url: chargeData.notification_url,
        },
      };

      const response = await gerencianet.createCharge({}, body);
      
      console.log('✅ Cobrança EFI criada:', response.data.charge_id);
      return response;
    } catch (error) {
      console.error('❌ Erro ao criar cobrança EFI:', error);
      throw error;
    }
  }

  /**
   * Gerar boleto para cobrança
   */
  async generateBankingBillet(charge_id, billetData) {
    try {
      const gerencianet = new Gerencianet(this.options);

      const params = { id: charge_id };

      const body = {
        banking_billet: {
          expire_at: billetData.expire_at, // YYYY-MM-DD
          customer: {
            name: billetData.customer.name,
            email: billetData.customer.email,
            cpf: billetData.customer.cpf,
            phone_number: billetData.customer.phone,
            birth: billetData.customer.birth, // YYYY-MM-DD
            address: {
              street: billetData.customer.address.street,
              number: billetData.customer.address.number,
              neighborhood: billetData.customer.address.neighborhood,
              zipcode: billetData.customer.address.zipcode,
              city: billetData.customer.address.city,
              state: billetData.customer.address.state,
            },
          },
        },
      };

      const response = await gerencianet.defineBankingBilletPay(params, body);
      
      console.log('✅ Boleto gerado:', response.data.barcode);
      return response;
    } catch (error) {
      console.error('❌ Erro ao gerar boleto:', error);
      throw error;
    }
  }

  /**
   * Gerar PIX para cobrança
   */
  async generatePixCharge(pixData) {
    try {
      const gerencianet = new Gerencianet(this.options);

      const body = {
        calendario: {
          expiracao: pixData.expiracao || 3600, // segundos (1 hora)
        },
        devedor: {
          cpf: pixData.customer.cpf,
          nome: pixData.customer.name,
        },
        valor: {
          original: pixData.value.toFixed(2),
        },
        chave: process.env.EFI_PIX_KEY,
        solicitacaoPagador: pixData.description || 'Pagamento de assinatura',
        infoAdicionais: [{
          nome: 'custom_id',
          valor: pixData.custom_id,
        }],
      };

      const response = await gerencianet.pixCreateImmediateCharge({}, body);
      
      console.log('✅ PIX gerado:', response.txid);
      return response;
    } catch (error) {
      console.error('❌ Erro ao gerar PIX:', error);
      throw error;
    }
  }

  /**
   * Consultar status de assinatura
   */
  async getSubscription(subscription_id) {
    try {
      const gerencianet = new Gerencianet(this.options);
      const params = { id: subscription_id };

      const response = await gerencianet.detailSubscription(params);
      
      console.log('✅ Assinatura consultada:', subscription_id);
      return response;
    } catch (error) {
      console.error('❌ Erro ao consultar assinatura:', error);
      throw error;
    }
  }

  /**
   * Cancelar assinatura
   */
  async cancelSubscription(subscription_id) {
    try {
      const gerencianet = new Gerencianet(this.options);
      const params = { id: subscription_id };

      const response = await gerencianet.cancelSubscription(params);
      
      console.log('✅ Assinatura cancelada:', subscription_id);
      return response;
    } catch (error) {
      console.error('❌ Erro ao cancelar assinatura:', error);
      throw error;
    }
  }

  /**
   * Gerar QR Code PIX
   */
  async generatePixQRCode(loc_id) {
    try {
      const gerencianet = new Gerencianet(this.options);
      const params = { id: loc_id };

      const response = await gerencianet.pixGenerateQRCode(params);
      
      console.log('✅ QR Code PIX gerado');
      return response;
    } catch (error) {
      console.error('❌ Erro ao gerar QR Code PIX:', error);
      throw error;
    }
  }
}

export default new EfiSubscriptionService();
