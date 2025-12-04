import axios from 'axios';
import logger from '../../logger';

/**
 * Serviço de integração com Z-API (WhatsApp Business)
 * Envia mensagens, textos, imagens e documentos
 */
class ZApiService {
  constructor(credentials) {
    this.instance = credentials.instance;
    this.token = credentials.token;
    this.clientToken = credentials.client_token;
    this.baseUrl = `https://api.z-api.io/instances/${this.instance}/token/${this.token}`;
  }

  /**
   * Envia mensagem de texto
   */
  async sendText(phone, message) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/send-text`,
        {
          phone: this.formatPhone(phone),
          message: message,
        },
        {
          headers: {
            'Client-Token': this.clientToken,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`WhatsApp enviado para ${phone}`);
      return response.data;
    } catch (error) {
      logger.error('Erro ao enviar WhatsApp:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Envia mensagem com link (preview)
   */
  async sendLink(phone, message, linkUrl, linkTitle, linkDescription, linkImage) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/send-link`,
        {
          phone: this.formatPhone(phone),
          message: message,
          linkUrl: linkUrl,
          title: linkTitle,
          description: linkDescription,
          image: linkImage,
        },
        {
          headers: {
            'Client-Token': this.clientToken,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Erro ao enviar link WhatsApp:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Envia imagem
   */
  async sendImage(phone, imageUrl, caption = '') {
    try {
      const response = await axios.post(
        `${this.baseUrl}/send-image`,
        {
          phone: this.formatPhone(phone),
          image: imageUrl,
          caption: caption,
        },
        {
          headers: {
            'Client-Token': this.clientToken,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Erro ao enviar imagem WhatsApp:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Envia documento/arquivo
   */
  async sendDocument(phone, documentUrl, fileName, caption = '') {
    try {
      const response = await axios.post(
        `${this.baseUrl}/send-document/${this.formatPhone(phone)}`,
        {
          document: documentUrl,
          fileName: fileName,
          caption: caption,
        },
        {
          headers: {
            'Client-Token': this.clientToken,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Erro ao enviar documento WhatsApp:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verifica status da instância
   */
  async getStatus() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/status`,
        {
          headers: {
            'Client-Token': this.clientToken,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Erro ao verificar status Z-API:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Formata número de telefone para padrão Z-API
   * Formato: 5511999999999
   */
  formatPhone(phone) {
    // Remove todos os caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '');
    
    // Se não tem código do país, adiciona 55 (Brasil)
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Templates de mensagens prontas
   */
  templates = {
    boasVindas: (nome, plano) => `
🎉 *Bem-vindo ao MK-Edge!*

Olá *${nome}*! 

Sua assinatura do plano *${plano}* foi ativada com sucesso! 

Agora você já pode acessar nosso aplicativo e gerenciar seus chamados de suporte de forma eficiente.

📱 Acesse: https://app.mkedge.com.br

Precisa de ajuda? Estamos à disposição!
    `.trim(),

    lembreteVencimento: (nome, dias, valor, linkPagamento) => `
⏰ *Lembrete de Vencimento*

Olá *${nome}*!

Sua assinatura vence em *${dias} dia(s)*.

💰 Valor: R$ ${valor.toFixed(2)}

Para garantir a continuidade do serviço, realize o pagamento:
${linkPagamento}

_Dúvidas? Entre em contato conosco._
    `.trim(),

    faturaPaga: (nome, valor, dataProximo) => `
✅ *Pagamento Confirmado!*

Olá *${nome}*!

Seu pagamento de *R$ ${valor.toFixed(2)}* foi confirmado com sucesso!

📅 Próximo vencimento: ${dataProximo}

Obrigado por continuar conosco! 🙏
    `.trim(),

    faturaVencida: (nome, dias, valor, linkPagamento) => `
⚠️ *Fatura Vencida*

Olá *${nome}*!

Sua fatura venceu há *${dias} dia(s)*.

💰 Valor: R$ ${valor.toFixed(2)}

Para evitar a suspensão do serviço, regularize o pagamento:
${linkPagamento}

_Entre em contato se tiver alguma dificuldade._
    `.trim(),

    servicoSuspenso: (nome) => `
🚫 *Serviço Suspenso*

Olá *${nome}*!

Infelizmente, devido ao não pagamento, seu serviço foi temporariamente suspenso.

Para reativar, regularize os pagamentos pendentes ou entre em contato conosco.

📞 Suporte: (11) 99999-9999
    `.trim(),

    pixGerado: (nome, valor, pixCopiaECola) => `
💳 *Pix Gerado!*

Olá *${nome}*!

Seu Pix no valor de *R$ ${valor.toFixed(2)}* foi gerado com sucesso!

*Pix Copia e Cola:*
\`\`\`${pixCopiaECola}\`\`\`

_O QR Code também está disponível no link de pagamento._

⏰ Válido por 24 horas
    `.trim(),
  };
}

export default ZApiService;
