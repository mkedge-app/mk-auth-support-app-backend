import { format, addMonths, addDays, differenceInDays, isPast } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import Tenant from '../schemas/Tenant';
import Subscription from '../schemas/Subscription';
import Invoice from '../schemas/Invoice';
import EfiService from '../helpers/EfiService';
import ZApiService from '../helpers/ZApiService';
import integrationsConfig from '../../config/integrations';
import logger from '../../logger';

class SubscriptionController {
  /**
   * Lista todas as assinaturas
   */
  async index(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      
      const filter = {};
      if (status) {
        filter.status = status;
      }

      const subscriptions = await Subscription.find(filter)
        .populate('tenant_id', 'cnpj responsavel contato provedor')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });

      const total = await Subscription.countDocuments(filter);

      return res.json({
        subscriptions,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      });
    } catch (error) {
      logger.error('Erro ao listar assinaturas:', error);
      return res.status(500).json({ error: 'Erro ao listar assinaturas' });
    }
  }

  /**
   * Detalhes de uma assinatura específica
   */
  async show(req, res) {
    try {
      const { id } = req.params;

      const subscription = await Subscription.findById(id)
        .populate('tenant_id');

      if (!subscription) {
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }

      // Buscar faturas relacionadas
      const invoices = await Invoice.find({ subscription_id: id })
        .sort({ data_vencimento: -1 });

      return res.json({
        subscription,
        invoices,
      });
    } catch (error) {
      logger.error('Erro ao buscar assinatura:', error);
      return res.status(500).json({ error: 'Erro ao buscar assinatura' });
    }
  }

  /**
   * Cria nova assinatura para um tenant
   */
  async create(req, res) {
    try {
      const {
        tenant_id,
        plano,
        valor,
        dia_vencimento,
        trial_days = 0,
        metodo_pagamento,
      } = req.body;

      const tenant = await Tenant.findById(tenant_id);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant não encontrado' });
      }

      // Verifica se já existe assinatura ativa
      const existingSubscription = await Subscription.findOne({
        tenant_id,
        status: { $in: ['trial', 'active'] },
      });

      if (existingSubscription) {
        return res.status(400).json({
          error: 'Tenant já possui assinatura ativa',
        });
      }

      // Calcula datas
      const now = new Date();
      let proximo_vencimento = new Date();
      let trial_ends_at = null;

      if (trial_days > 0) {
        trial_ends_at = addDays(now, trial_days);
        proximo_vencimento = addDays(trial_ends_at, 1);
      } else {
        proximo_vencimento.setDate(dia_vencimento);
        if (proximo_vencimento < now) {
          proximo_vencimento = addMonths(proximo_vencimento, 1);
        }
      }

      // Cria assinatura
      const subscription = await Subscription.create({
        tenant_id,
        status: trial_days > 0 ? 'trial' : 'active',
        plano,
        valor,
        dia_vencimento,
        proximo_vencimento,
        trial_ends_at,
        metodo_pagamento,
      });

      // Atualiza tenant
      tenant.assinatura.status = subscription.status;
      tenant.assinatura.ativa = true;
      tenant.assinatura.plano = plano;
      tenant.assinatura.valor = valor;
      tenant.assinatura.dia_vencimento = dia_vencimento.toString();
      tenant.assinatura.proximo_pagamento = proximo_vencimento;
      tenant.assinatura.trial_ends_at = trial_ends_at;
      tenant.assinatura.metodo_pagamento = metodo_pagamento;
      await tenant.save();

      // Envia mensagem de boas-vindas
      if (integrationsConfig.zapi.instance && integrationsConfig.notifications.whatsapp_enabled) {
        try {
          const zapi = new ZApiService({
            instance: integrationsConfig.zapi.instance,
            token: integrationsConfig.zapi.token,
            client_token: integrationsConfig.zapi.client_token,
          });

          await zapi.sendText(
            tenant.contato,
            zapi.templates.boasVindas(tenant.responsavel, plano)
          );
        } catch (error) {
          logger.error('Erro ao enviar WhatsApp de boas-vindas:', error);
        }
      }

      return res.status(201).json(subscription);
    } catch (error) {
      logger.error('Erro ao criar assinatura:', error);
      return res.status(500).json({ error: 'Erro ao criar assinatura' });
    }
  }

  /**
   * Gera uma nova fatura para a assinatura
   */
  async generateInvoice(req, res) {
    try {
      const { subscription_id } = req.params;
      const { metodo_pagamento = 'pix' } = req.body;

      const subscription = await Subscription.findById(subscription_id)
        .populate('tenant_id');

      if (!subscription) {
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }

      const tenant = subscription.tenant_id;

      // Gera número da fatura
      const numero_fatura = `INV-${Date.now()}-${uuidv4().substring(0, 8)}`;

      // Cria fatura
      const invoice = await Invoice.create({
        tenant_id: tenant._id,
        subscription_id: subscription._id,
        numero_fatura,
        valor: subscription.valor,
        data_vencimento: subscription.proximo_vencimento,
        metodo_pagamento,
        status: 'pending',
      });

      // Gera cobrança na EFI
      if (integrationsConfig.efi.client_id && metodo_pagamento === 'pix') {
        try {
          const efi = new EfiService({
            client_id: integrationsConfig.efi.client_id,
            client_secret: integrationsConfig.efi.client_secret,
            certificate: integrationsConfig.efi.certificate,
            sandbox: integrationsConfig.efi.sandbox,
          });

          const txid = uuidv4().replace(/-/g, '');
          const pixCharge = await efi.createPixCharge({
            txid,
            valor: subscription.valor,
            devedor: {
              cnpj: tenant.cnpj,
              nome: tenant.responsavel,
            },
            expiracao: 86400, // 24 horas
            descricao: `Assinatura ${subscription.plano} - ${format(new Date(), 'MM/yyyy')}`,
          });

          // Atualiza fatura com dados do Pix
          invoice.efi_txid = pixCharge.txid;
          invoice.efi_pix_qrcode = pixCharge.pixCopiaECola;
          invoice.efi_pix_qrcode_image = pixCharge.qrcodeImage;
          await invoice.save();

          // Envia Pix por WhatsApp
          if (integrationsConfig.zapi.instance && integrationsConfig.notifications.whatsapp_enabled) {
            try {
              const zapi = new ZApiService({
                instance: integrationsConfig.zapi.instance,
                token: integrationsConfig.zapi.token,
                client_token: integrationsConfig.zapi.client_token,
              });

              await zapi.sendText(
                tenant.contato,
                zapi.templates.pixGerado(
                  tenant.responsavel,
                  subscription.valor,
                  pixCharge.pixCopiaECola
                )
              );

              // Envia imagem do QR Code
              if (pixCharge.qrcodeImage) {
                await zapi.sendImage(
                  tenant.contato,
                  pixCharge.qrcodeImage,
                  'Escaneie o QR Code para pagar'
                );
              }
            } catch (error) {
              logger.error('Erro ao enviar Pix por WhatsApp:', error);
            }
          }
        } catch (error) {
          logger.error('Erro ao gerar Pix na EFI:', error);
        }
      }

      return res.status(201).json(invoice);
    } catch (error) {
      logger.error('Erro ao gerar fatura:', error);
      return res.status(500).json({ error: 'Erro ao gerar fatura' });
    }
  }

  /**
   * Cancela assinatura
   */
  async cancel(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      const subscription = await Subscription.findById(id)
        .populate('tenant_id');

      if (!subscription) {
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }

      subscription.status = 'cancelled';
      subscription.data_fim = new Date();
      subscription.notas = motivo || 'Cancelamento solicitado';
      await subscription.save();

      // Atualiza tenant
      const tenant = subscription.tenant_id;
      tenant.assinatura.status = 'cancelled';
      tenant.assinatura.ativa = false;
      await tenant.save();

      return res.json({
        message: 'Assinatura cancelada com sucesso',
        subscription,
      });
    } catch (error) {
      logger.error('Erro ao cancelar assinatura:', error);
      return res.status(500).json({ error: 'Erro ao cancelar assinatura' });
    }
  }

  /**
   * Suspende assinatura por falta de pagamento
   */
  async suspend(req, res) {
    try {
      const { id } = req.params;

      const subscription = await Subscription.findById(id)
        .populate('tenant_id');

      if (!subscription) {
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }

      subscription.status = 'suspended';
      await subscription.save();

      // Atualiza tenant
      const tenant = subscription.tenant_id;
      tenant.assinatura.status = 'suspended';
      tenant.assinatura.ativa = false;
      await tenant.save();

      // Envia notificação de suspensão
      if (integrationsConfig.zapi.instance && integrationsConfig.notifications.whatsapp_enabled) {
        try {
          const zapi = new ZApiService({
            instance: integrationsConfig.zapi.instance,
            token: integrationsConfig.zapi.token,
            client_token: integrationsConfig.zapi.client_token,
          });

          await zapi.sendText(
            tenant.contato,
            zapi.templates.servicoSuspenso(tenant.responsavel)
          );
        } catch (error) {
          logger.error('Erro ao enviar notificação de suspensão:', error);
        }
      }

      return res.json({
        message: 'Assinatura suspensa',
        subscription,
      });
    } catch (error) {
      logger.error('Erro ao suspender assinatura:', error);
      return res.status(500).json({ error: 'Erro ao suspender assinatura' });
    }
  }

  /**
   * Reativa assinatura suspensa
   */
  async reactivate(req, res) {
    try {
      const { id } = req.params;

      const subscription = await Subscription.findById(id)
        .populate('tenant_id');

      if (!subscription) {
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }

      subscription.status = 'active';
      subscription.tentativas_falhas = 0;
      await subscription.save();

      // Atualiza tenant
      const tenant = subscription.tenant_id;
      tenant.assinatura.status = 'active';
      tenant.assinatura.ativa = true;
      tenant.assinatura.tentativas_falhas = 0;
      await tenant.save();

      return res.json({
        message: 'Assinatura reativada com sucesso',
        subscription,
      });
    } catch (error) {
      logger.error('Erro ao reativar assinatura:', error);
      return res.status(500).json({ error: 'Erro ao reativar assinatura' });
    }
  }
}

export default new SubscriptionController();
