import axios from 'axios';
import fs from 'fs';
import https from 'https';
import logger from '../../logger';

/**
 * Serviço de integração com EFI (Gerencianet)
 * Suporta: Pix, Boleto e Webhooks
 */
class EfiService {
  constructor(credentials) {
    this.clientId = credentials.client_id;
    this.clientSecret = credentials.client_secret;
    this.certificate = credentials.certificate;
    this.sandbox = credentials.sandbox || false;
    
    this.baseUrl = this.sandbox
      ? 'https://api-pix-h.gerencianet.com.br'
      : 'https://api-pix.gerencianet.com.br';
    
    this.accessToken = null;
    this.tokenExpiresAt = null;
  }

  /**
   * Obtém o access token (OAuth2)
   */
  async authenticate() {
    try {
      // Se já tem token válido, retorna
      if (this.accessToken && this.tokenExpiresAt > Date.now()) {
        return this.accessToken;
      }

      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const agent = new https.Agent({
        pfx: fs.readFileSync(this.certificate),
        passphrase: '',
      });

      const response = await axios.post(
        `${this.baseUrl}/oauth/token`,
        { grant_type: 'client_credentials' },
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          httpsAgent: agent,
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);

      return this.accessToken;
    } catch (error) {
      logger.error('Erro ao autenticar na EFI:', error.response?.data || error.message);
      throw new Error('Falha na autenticação EFI');
    }
  }

  /**
   * Cria cobrança Pix
   */
  async createPixCharge({ txid, valor, devedor, expiracao = 3600, descricao }) {
    try {
      const token = await this.authenticate();
      
      const agent = new https.Agent({
        pfx: fs.readFileSync(this.certificate),
        passphrase: '',
      });

      const body = {
        calendario: {
          expiracao: expiracao, // em segundos (padrão: 1 hora)
        },
        devedor: {
          cpf: devedor.cpf?.replace(/\D/g, ''),
          cnpj: devedor.cnpj?.replace(/\D/g, ''),
          nome: devedor.nome,
        },
        valor: {
          original: valor.toFixed(2),
        },
        chave: process.env.EFI_PIX_KEY, // Chave Pix da conta
        solicitacaoPagador: descricao || 'Pagamento de assinatura',
      };

      const response = await axios.put(
        `${this.baseUrl}/v2/cob/${txid}`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          httpsAgent: agent,
        }
      );

      // Gerar QR Code
      const qrCodeResponse = await axios.get(
        `${this.baseUrl}/v2/loc/${response.data.loc.id}/qrcode`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          httpsAgent: agent,
        }
      );

      return {
        txid: response.data.txid,
        status: response.data.status,
        pixCopiaECola: response.data.pixCopiaECola,
        qrcode: qrCodeResponse.data.qrcode,
        qrcodeImage: qrCodeResponse.data.imagemQrcode,
        valor: response.data.valor.original,
        expiracao: response.data.calendario.expiracao,
      };
    } catch (error) {
      logger.error('Erro ao criar cobrança Pix:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Cria boleto bancário
   */
  async createBoleto({ valor, devedor, vencimento, descricao }) {
    try {
      const token = await this.authenticate();
      
      const agent = new https.Agent({
        pfx: fs.readFileSync(this.certificate),
        passphrase: '',
      });

      const body = {
        items: [{
          name: descricao || 'Assinatura Mensal',
          value: Math.round(valor * 100), // valor em centavos
          amount: 1,
        }],
        customer: {
          name: devedor.nome,
          cpf: devedor.cpf?.replace(/\D/g, ''),
          cnpj: devedor.cnpj?.replace(/\D/g, ''),
          email: devedor.email,
          phone_number: devedor.telefone?.replace(/\D/g, ''),
        },
        banking_billet: {
          expire_at: vencimento,
          customer: {
            name: devedor.nome,
            cpf: devedor.cpf?.replace(/\D/g, ''),
            cnpj: devedor.cnpj?.replace(/\D/g, ''),
            email: devedor.email,
            phone_number: devedor.telefone?.replace(/\D/g, ''),
          },
        },
        payment: {
          banking_billet: {
            expire_at: vencimento,
          },
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/v1/charge`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          httpsAgent: agent,
        }
      );

      return {
        charge_id: response.data.data.charge_id,
        status: response.data.data.status,
        barcode: response.data.data.barcode,
        link: response.data.data.link,
        billet_link: response.data.data.billet_link,
        pdf: response.data.data.pdf?.charge,
        expire_at: response.data.data.expire_at,
      };
    } catch (error) {
      logger.error('Erro ao criar boleto:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Consulta status de cobrança Pix
   */
  async getPixCharge(txid) {
    try {
      const token = await this.authenticate();
      
      const agent = new https.Agent({
        pfx: fs.readFileSync(this.certificate),
        passphrase: '',
      });

      const response = await axios.get(
        `${this.baseUrl}/v2/cob/${txid}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          httpsAgent: agent,
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Erro ao consultar cobrança Pix:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Consulta status de boleto
   */
  async getBoleto(chargeId) {
    try {
      const token = await this.authenticate();
      
      const agent = new https.Agent({
        pfx: fs.readFileSync(this.certificate),
        passphrase: '',
      });

      const response = await axios.get(
        `${this.baseUrl}/v1/charge/${chargeId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          httpsAgent: agent,
        }
      );

      return response.data.data;
    } catch (error) {
      logger.error('Erro ao consultar boleto:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Configura webhook para notificações
   */
  async configureWebhook(webhookUrl, chave) {
    try {
      const token = await this.authenticate();
      
      const agent = new https.Agent({
        pfx: fs.readFileSync(this.certificate),
        passphrase: '',
      });

      const response = await axios.put(
        `${this.baseUrl}/v2/webhook/${chave}`,
        { webhookUrl },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          httpsAgent: agent,
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Erro ao configurar webhook:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Cancela cobrança Pix
   */
  async cancelPixCharge(txid) {
    try {
      const token = await this.authenticate();
      
      const agent = new https.Agent({
        pfx: fs.readFileSync(this.certificate),
        passphrase: '',
      });

      const response = await axios.patch(
        `${this.baseUrl}/v2/cob/${txid}`,
        { status: 'REMOVIDA_PELO_USUARIO_RECEBEDOR' },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          httpsAgent: agent,
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Erro ao cancelar cobrança Pix:', error.response?.data || error.message);
      throw error;
    }
  }
}

export default EfiService;
