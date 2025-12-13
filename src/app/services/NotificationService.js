import axios from 'axios';
import NotificationLog from '../schemas/NotificationLog';
import MessageTemplate from '../schemas/MessageTemplate';

class NotificationService {
  constructor() {
    this.zapiUrl = process.env.ZAPI_URL;
    this.zapiToken = process.env.ZAPI_TOKEN;
    this.zapiClientToken = process.env.ZAPI_CLIENT_TOKEN;
  }

  /**
   * Envia mensagem via WhatsApp (Z-API)
   */
  async sendWhatsApp(phone, message) {
    try {
      // Formatar número: remover caracteres especiais e adicionar código do país
      const cleanPhone = phone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      
      const response = await axios.post(
        `${this.zapiUrl}/send-text`,
        {
          phone: formattedPhone,
          message
        },
        {
          headers: {
            'Client-Token': this.zapiClientToken
          }
        }
      );
      
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Envia email (placeholder - implementar SMTP)
   */
  async sendEmail(email, subject, message) {
    try {
      // TODO: Implementar envio de email via SMTP
      console.log('Email enviado para:', email);
      console.log('Assunto:', subject);
      console.log('Mensagem:', message);
      
      return {
        success: true,
        data: { message: 'Email enviado com sucesso (simulado)' }
      };
      
    } catch (error) {
      console.error('Erro ao enviar email:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Renderiza template com variáveis
   */
  renderTemplate(template, variables) {
    let rendered = template;
    
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, variables[key] || '');
    });
    
    return rendered;
  }

  /**
   * Envia notificação completa (template + log + envio)
   */
  async sendNotification(options) {
    const {
      tenant_id,
      template_type,
      channel,
      recipient,
      recipient_name,
      variables = {}
    } = options;

    try {
      // Buscar template
      const template = await MessageTemplate.findOne({ type: template_type });
      
      if (!template || !template.enabled) {
        throw new Error(`Template ${template_type} não encontrado ou desabilitado`);
      }

      // Renderizar mensagem
      let message, subject;
      
      if (channel === 'whatsapp') {
        message = this.renderTemplate(template.whatsapp_message, variables);
      } else if (channel === 'email') {
        subject = this.renderTemplate(template.subject, variables);
        message = this.renderTemplate(template.email_message, variables);
      }

      // Criar log inicial
      const log = await NotificationLog.create({
        tenant_id,
        template_type,
        channel,
        recipient,
        recipient_name,
        message,
        status: 'pending',
        metadata: variables.metadata || {}
      });

      // Enviar mensagem
      let result;
      
      if (channel === 'whatsapp') {
        result = await this.sendWhatsApp(recipient, message);
      } else if (channel === 'email') {
        result = await this.sendEmail(recipient, subject, message);
      }

      // Atualizar log com resultado
      if (result.success) {
        log.status = 'sent';
        log.sent_at = new Date();
      } else {
        log.status = 'failed';
        log.error_message = result.error;
      }
      
      await log.save();

      return {
        success: result.success,
        log,
        result
      };
      
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      
      // Tentar criar log de erro
      try {
        await NotificationLog.create({
          tenant_id,
          template_type,
          channel,
          recipient,
          recipient_name,
          message: error.message,
          status: 'failed',
          error_message: error.message
        });
      } catch (logError) {
        console.error('Erro ao criar log de erro:', logError);
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Envia notificação de boas-vindas
   */
  async sendWelcome(tenant) {
    return this.sendNotification({
      tenant_id: tenant._id,
      template_type: 'welcome',
      channel: 'whatsapp',
      recipient: tenant.telefone || tenant.celular,
      recipient_name: tenant.nome_fantasia || tenant.razao_social,
      variables: {
        nome: tenant.nome_fantasia || tenant.razao_social
      }
    });
  }

  /**
   * Envia lembrete de vencimento
   */
  async sendReminder(subscription, tenant) {
    const dueDate = new Date(subscription.next_due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    return this.sendNotification({
      tenant_id: tenant._id,
      template_type: 'reminder',
      channel: 'whatsapp',
      recipient: tenant.telefone || tenant.celular,
      recipient_name: tenant.nome_fantasia || tenant.razao_social,
      variables: {
        nome: tenant.nome_fantasia || tenant.razao_social,
        valor: subscription.value ? `R$ ${(subscription.value / 100).toFixed(2)}` : 'R$ 0,00',
        vencimento: dueDate.toLocaleDateString('pt-BR'),
        dias: daysUntilDue.toString()
      },
      metadata: {
        subscription_id: subscription._id,
        due_date: subscription.next_due_date,
        invoice_amount: subscription.value
      }
    });
  }

  /**
   * Envia confirmação de pagamento
   */
  async sendConfirmation(subscription, tenant, paymentData = {}) {
    return this.sendNotification({
      tenant_id: tenant._id,
      template_type: 'confirmed',
      channel: 'whatsapp',
      recipient: tenant.telefone || tenant.celular,
      recipient_name: tenant.nome_fantasia || tenant.razao_social,
      variables: {
        nome: tenant.nome_fantasia || tenant.razao_social,
        valor: subscription.value ? `R$ ${(subscription.value / 100).toFixed(2)}` : 'R$ 0,00',
        vencimento: subscription.next_due_date ? new Date(subscription.next_due_date).toLocaleDateString('pt-BR') : ''
      },
      metadata: {
        subscription_id: subscription._id,
        charge_id: paymentData.charge_id,
        invoice_amount: subscription.value
      }
    });
  }

  /**
   * Envia aviso de suspensão
   */
  async sendSuspension(subscription, tenant, paymentLink = '') {
    return this.sendNotification({
      tenant_id: tenant._id,
      template_type: 'suspension',
      channel: 'whatsapp',
      recipient: tenant.telefone || tenant.celular,
      recipient_name: tenant.nome_fantasia || tenant.razao_social,
      variables: {
        nome: tenant.nome_fantasia || tenant.razao_social,
        valor: subscription.value ? `R$ ${(subscription.value / 100).toFixed(2)}` : 'R$ 0,00',
        link_pagamento: paymentLink
      },
      metadata: {
        subscription_id: subscription._id,
        payment_link: paymentLink,
        invoice_amount: subscription.value
      }
    });
  }
}

export default new NotificationService();
