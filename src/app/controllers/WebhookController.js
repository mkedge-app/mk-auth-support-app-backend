import { format, addMonths } from 'date-fns';
import Invoice from '../schemas/Invoice';
import Subscription from '../schemas/Subscription';
import Tenant from '../schemas/Tenant';
import ZApiService from '../helpers/ZApiService';
import integrationsConfig from '../../config/integrations';
import logger from '../../logger';

class WebhookController {
  /**
   * Recebe webhooks da EFI (Pix)
   */
  async efiPix(req, res) {
    try {
      logger.info('Webhook EFI Pix recebido:', JSON.stringify(req.body));

      const { pix } = req.body;

      if (!pix || pix.length === 0) {
        return res.status(400).json({ error: 'Webhook inválido' });
      }

      // Processa cada transação Pix
      for (const transaction of pix) {
        const { txid, horario, valor } = transaction;

        // Busca a fatura pelo txid
        const invoice = await Invoice.findOne({ efi_txid: txid })
          .populate({
            path: 'tenant_id',
            populate: { path: 'tenant_id' }
          });

        if (!invoice) {
          logger.warn(`Fatura não encontrada para txid: ${txid}`);
          continue;
        }

        if (invoice.status === 'paid') {
          logger.info(`Fatura ${invoice.numero_fatura} já foi paga anteriormente`);
          continue;
        }

        // Atualiza fatura como paga
        invoice.status = 'paid';
        invoice.data_pagamento = new Date(horario);
        invoice.valor_pago = parseFloat(valor);
        invoice.historico.push({
          evento: 'payment_received',
          descricao: 'Pagamento via Pix recebido',
          dados: { txid, valor, horario },
        });
        await invoice.save();

        // Busca a assinatura
        const subscription = await Subscription.findById(invoice.subscription_id);
        if (subscription) {
          // Calcula próximo vencimento
          const proximo_vencimento = addMonths(
            invoice.data_vencimento,
            1
          );
          proximo_vencimento.setDate(subscription.dia_vencimento);

          subscription.status = 'active';
          subscription.proximo_vencimento = proximo_vencimento;
          subscription.tentativas_falhas = 0;
          await subscription.save();

          // Atualiza tenant
          const tenant = await Tenant.findById(invoice.tenant_id);
          if (tenant) {
            tenant.assinatura.status = 'active';
            tenant.assinatura.ativa = true;
            tenant.assinatura.ultimo_pagamento = invoice.data_pagamento;
            tenant.assinatura.proximo_pagamento = proximo_vencimento;
            tenant.assinatura.tentativas_falhas = 0;
            await tenant.save();

            // Envia confirmação por WhatsApp
            if (integrationsConfig.zapi.instance && integrationsConfig.notifications.whatsapp_enabled) {
              try {
                const zapi = new ZApiService({
                  instance: integrationsConfig.zapi.instance,
                  token: integrationsConfig.zapi.token,
                  client_token: integrationsConfig.zapi.client_token,
                });

                await zapi.sendText(
                  tenant.contato,
                  zapi.templates.faturaPaga(
                    tenant.responsavel,
                    parseFloat(valor),
                    format(proximo_vencimento, 'dd/MM/yyyy')
                  )
                );

                invoice.notificacoes_enviadas.push({
                  tipo: 'whatsapp',
                  status: 'sent',
                  mensagem: 'Confirmação de pagamento',
                });
                await invoice.save();
              } catch (error) {
                logger.error('Erro ao enviar confirmação por WhatsApp:', error);
              }
            }
          }
        }

        logger.info(`Pagamento processado com sucesso: ${invoice.numero_fatura}`);
      }

      return res.status(200).json({ message: 'Webhook processado' });
    } catch (error) {
      logger.error('Erro ao processar webhook EFI:', error);
      return res.status(500).json({ error: 'Erro ao processar webhook' });
    }
  }

  /**
   * Recebe webhooks da EFI (Boleto)
   */
  async efiBoleto(req, res) {
    try {
      logger.info('Webhook EFI Boleto recebido:', JSON.stringify(req.body));

      const { notification } = req.body;

      if (!notification) {
        return res.status(400).json({ error: 'Webhook inválido' });
      }

      const { charge_id, status } = notification;

      // Busca a fatura pelo charge_id
      const invoice = await Invoice.findOne({ efi_charge_id: charge_id })
        .populate('tenant_id');

      if (!invoice) {
        logger.warn(`Fatura não encontrada para charge_id: ${charge_id}`);
        return res.status(404).json({ error: 'Fatura não encontrada' });
      }

      // Processa de acordo com o status
      switch (status) {
        case 'paid':
          if (invoice.status !== 'paid') {
            invoice.status = 'paid';
            invoice.data_pagamento = new Date();
            invoice.historico.push({
              evento: 'payment_received',
              descricao: 'Pagamento via Boleto recebido',
              dados: { charge_id, status },
            });
            await invoice.save();

            // Atualiza assinatura (mesmo processo do Pix)
            const subscription = await Subscription.findById(invoice.subscription_id);
            if (subscription) {
              const proximo_vencimento = addMonths(
                invoice.data_vencimento,
                1
              );
              proximo_vencimento.setDate(subscription.dia_vencimento);

              subscription.status = 'active';
              subscription.proximo_vencimento = proximo_vencimento;
              subscription.tentativas_falhas = 0;
              await subscription.save();

              // Atualiza tenant
              const tenant = invoice.tenant_id;
              tenant.assinatura.status = 'active';
              tenant.assinatura.ativa = true;
              tenant.assinatura.ultimo_pagamento = invoice.data_pagamento;
              tenant.assinatura.proximo_pagamento = proximo_vencimento;
              await tenant.save();

              // Notifica cliente
              if (integrationsConfig.zapi.instance && integrationsConfig.notifications.whatsapp_enabled) {
                const zapi = new ZApiService({
                  instance: integrationsConfig.zapi.instance,
                  token: integrationsConfig.zapi.token,
                  client_token: integrationsConfig.zapi.client_token,
                });

                await zapi.sendText(
                  tenant.contato,
                  zapi.templates.faturaPaga(
                    tenant.responsavel,
                    invoice.valor,
                    format(proximo_vencimento, 'dd/MM/yyyy')
                  )
                );
              }
            }

            logger.info(`Boleto pago processado: ${invoice.numero_fatura}`);
          }
          break;

        case 'canceled':
          invoice.status = 'cancelled';
          invoice.historico.push({
            evento: 'boleto_cancelled',
            descricao: 'Boleto cancelado',
            dados: { charge_id, status },
          });
          await invoice.save();
          break;

        default:
          logger.info(`Status de boleto não tratado: ${status}`);
      }

      return res.status(200).json({ message: 'Webhook processado' });
    } catch (error) {
      logger.error('Erro ao processar webhook boleto:', error);
      return res.status(500).json({ error: 'Erro ao processar webhook' });
    }
  }

  /**
   * Recebe webhooks da Z-API (Confirmação de mensagens)
   */
  async zapiStatus(req, res) {
    try {
      logger.info('Webhook Z-API recebido:', JSON.stringify(req.body));
      
      // Apenas log para auditoria
      // Você pode implementar lógica adicional se necessário
      
      return res.status(200).json({ message: 'Webhook recebido' });
    } catch (error) {
      logger.error('Erro ao processar webhook Z-API:', error);
      return res.status(500).json({ error: 'Erro ao processar webhook' });
    }
  }
}

export default new WebhookController();
