/* eslint-disable no-else-return */
import { format, addHours } from 'date-fns';
import { Op } from 'sequelize';
import { createHash } from 'crypto';

import Invoice from '../models/Invoice';
import InvoiceMongo from '../schemas/Invoice';
import Client from '../models/Client';
import QRPix from '../models/QRPix';

class InvoiceController {
  // Admin - Listar todas as faturas
  async index(req, res) {
    try {
      const { status, page = 1, limit = 50 } = req.query;
      
      const filter = {};
      if (status) {
        filter.status = status;
      }

      const invoices = await InvoiceMongo.find(filter)
        .populate('tenant_id', 'cnpj responsavel contato provedor')
        .populate('subscription_id', 'plano amount')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });

      const total = await InvoiceMongo.countDocuments(filter);

      return res.json({
        invoices,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      });
    } catch (error) {
      console.error('Erro ao listar faturas:', error);
      return res.status(500).json({ error: 'Erro ao listar faturas' });
    }
  }

  // Admin - Marcar fatura como paga
  async markAsPaid(req, res) {
    try {
      const { id } = req.params;
      
      const invoice = await InvoiceMongo.findById(id);
      
      if (!invoice) {
        return res.status(404).json({ error: 'Fatura não encontrada' });
      }

      invoice.status = 'paid';
      invoice.data_pagamento = new Date();
      invoice.valor_pago = invoice.valor;
      await invoice.save();

      return res.json({ success: true, invoice });
    } catch (error) {
      console.error('Erro ao marcar fatura como paga:', error);
      return res.status(500).json({ error: 'Erro ao atualizar fatura' });
    }
  }

  async show(req, res) {
    try {
      const { client_id } = req.params;

      const client = await Client.findByPk(client_id);
    
      if (!client) {
        return res.status(404).json({ error: 'Cliente n\u00e3o encontrado' });
      }

    const { login, observacao, rem_obs } = client;

    const pendingInvoices = await Invoice.findAll({
      where: {
        login,
        datadel: null,
        status: {
          [Op.or]: ['vencido', 'aberto'],
        },
      },
    });

    pendingInvoices.sort((a, b) => {
      const key1 = new Date(a.datavenc).getTime();
      const key2 = new Date(b.datavenc).getTime();

      if (key1 < key2) {
        return -1;
      } else if (key1 === key2) {
        return 0;
      } else {
        return 1;
      }
    });

    const pending_invoices = [];
    
    // URL base do tenant (configurar no .env ou buscar do tenant)
    const tenantUrl = process.env.TENANT_URL || 'https://provedor.updata.com.br';
    
    for (const invoice of pendingInvoices) {
      const titulo = invoice.id;
      const uuid_lanc = invoice.uuid_lanc;
      
      // Formata linha digitável (remove pontos e espaços)
      const linhadig_limpa = (invoice.linhadig || '').replace(/[. ]/g, '');
      
      // URL do boleto (FORMATO CORRETO)
      const linkBoleto = `${tenantUrl}/boleto/boleto.hhvm?titulo=${titulo}&contrato=${login}`;
      
      // Busca PIX na tabela sis_qrpix usando uuid_lanc
      let pixInfo = null;
      try {
        console.log(`🔍 Buscando PIX para uuid_lanc: ${uuid_lanc}`);
        
        const qrpix = await QRPix.findOne({
          where: { titulo: uuid_lanc }
        });
        
        console.log(`📄 Resultado PIX:`, qrpix ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
        
        if (qrpix && qrpix.qrcode) {
          const qrhash = createHash('md5').update(qrpix.qrcode).digest('hex');
          
          // URL do QR Code PIX (FORMATO CORRETO)
          const linkQrcode = `${tenantUrl}/boleto/qrcode/PIX.${qrhash}.png`;
          
          pixInfo = {
            qrcode: qrpix.qrcode,
            qrcode_hash: qrhash,
            qrcode_url: linkQrcode,
          };
          
          console.log(`✅ PIX montado com sucesso para título ${titulo}`);
        } else {
          console.log(`❌ QRCode não encontrado ou vazio para uuid_lanc ${uuid_lanc}`);
        }
      } catch (error) {
        console.error(`Erro ao buscar PIX para título ${uuid_lanc}:`, error);
      }
      
      pending_invoices.push({
        title: format(addHours(invoice.datavenc, 3), 'dd/MM/yyyy'),
        content: {
          titulo: invoice.id,
          uuid_lanc: invoice.uuid_lanc,
          tipo: invoice.tipo,
          valor: invoice.valor,
          status: invoice.status,
          descricao: invoice.obs,
          // Informações do Boleto
          boleto: {
            linhadig: linhadig_limpa,
            linhadig_formatada: invoice.linhadig,
            url: linkBoleto,
          },
          // Informações do PIX
          pix: pixInfo,
        },
      });
    }

    const paidInvoices = await Invoice.findAll({
      where: {
        login,
        datadel: null,
        status: 'pago',
      },
    });

    paidInvoices.sort((a, b) => {
      const keyA = a.datavenc;
      const keyB = b.datavenc;

      if (keyA < keyB) return -1;
      if (keyA > keyB) return 1;
      return 0;
    });

    paidInvoices.sort(
      (a, b) => new Date(b.datavenc).getTime() - new Date(a.datavenc).getTime()
    );

    const paid_invoices = [];
    paidInvoices.forEach(invoice => {
      paid_invoices.push({
        title: format(invoice.datavenc, 'dd/MM/yyyy'),
        content: {
          titulo: invoice.id,
          tipo: invoice.tipo,
          valor: invoice.valor,
          status: invoice.status,
          descricao: invoice.obs,
          paidAt: format(invoice.datapag, 'dd/MM/yyyy'),
        },
      });
    });

    const response = {
      pending_invoices,
      paid_invoices,
    };

    return res.json({
      observacao,
      rem_obs,
      invoices: response,
    });
    } catch (error) {
      console.error('Erro ao buscar faturas do cliente:', error);
      return res.status(500).json({ error: 'Erro ao buscar faturas do cliente' });
    }
  }
}

export default new InvoiceController();
