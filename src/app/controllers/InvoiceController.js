/* eslint-disable no-else-return */
import { format, addHours } from 'date-fns';
import { Op } from 'sequelize';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

import Invoice from '../models/Invoice';
import InvoiceMongo from '../schemas/Invoice';
import Client from '../models/Client';
import QRPix from '../models/QRPix';
import User from '../models/User';

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

    console.log(`📋 Buscando faturas para login: ${login}`);

    const pendingInvoices = await Invoice.findAll({
      where: {
        login,
        datadel: null,
        status: {
          [Op.or]: ['vencido', 'aberto'],
        },
      },
    });

    console.log(`📊 Faturas pendentes encontradas: ${pendingInvoices.length}`);

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

  // Buscar fatura específica por ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      
      console.log('🔍 Buscando fatura ID:', id);

      const invoice = await Invoice.findOne({
        where: {
          [Op.or]: [
            { id: id },
            { uuid_lanc: id }
          ]
        }
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Fatura não encontrada' });
      }

      console.log('📄 Fatura encontrada:', {
        id: invoice.id,
        uuid_lanc: invoice.uuid_lanc,
        status: invoice.status,
        datapag: invoice.datapag,
        valor: invoice.valor,
        datavenc: invoice.datavenc
      });

      return res.json({
        id: invoice.id,
        uuid_lanc: invoice.uuid_lanc,
        login: invoice.login,
        valor: invoice.valor,
        status: invoice.status,
        datavenc: invoice.datavenc,
        datapag: invoice.datapag,
        tipo: invoice.tipo,
        obs: invoice.obs,
        coletor: invoice.coletor,
        formapag: invoice.formapag
      });
    } catch (error) {
      console.error('❌ Erro ao buscar fatura:', error);
      return res.status(500).json({ 
        error: 'Erro ao buscar fatura',
        details: error.message 
      });
    }
  }

  async payInvoice(req, res) {
    try {
      const { 
        invoice_id, 
        titulo, 
        uuid_lanc,
        data_pagamento,
        formapag = 'dinheiro',
        acrescimo = 0,
        multa_mora = 0,
        desconto = 0,
        valor_pago,
        cartao_bandeira,
        cartao_numero,
        cheque_banco,
        cheque_numero,
        cheque_agcc,
        insnext,
        excluir_efipay,
      } = req.body;
      
      console.log('💰 InvoiceController.payInvoice - Dando baixa na fatura');
      console.log('📦 Payload:', { invoice_id, titulo, uuid_lanc, formapag, acrescimo, multa_mora, desconto });

      // Identificar fatura (aceita id, titulo ou uuid_lanc)
      const invoiceIdentifier = invoice_id || titulo || uuid_lanc;
      
      if (!invoiceIdentifier) {
        return res.status(400).json({ 
          error: 'ID da fatura é obrigatório (invoice_id, titulo ou uuid_lanc)' 
        });
      }

      // Buscar fatura
      const invoice = await Invoice.findOne({
        where: {
          [Op.or]: [
            { id: invoiceIdentifier },
            { uuid_lanc: invoiceIdentifier }
          ]
        }
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Fatura não encontrada' });
      }

      // Verificar se já está paga
      if (invoice.status === 'pago') {
        return res.status(400).json({ 
          error: 'Fatura já está paga',
          invoice: {
            id: invoice.id,
            uuid_lanc: invoice.uuid_lanc,
            status: invoice.status,
            datapag: invoice.datapag
          }
        });
      }

      // Calcular valor final
      const valorOriginal = parseFloat(invoice.valor) || 0;
      const valorAcrescimo = parseFloat(acrescimo) || 0;
      const valorMultaMora = parseFloat(multa_mora) || 0;
      const valorDesconto = parseFloat(desconto) || 0;
      const valorFinal = valorOriginal + valorAcrescimo + valorMultaMora - valorDesconto;

      console.log('💵 Cálculo:', { valorOriginal, valorAcrescimo, valorMultaMora, valorDesconto, valorFinal });

      // Atualizar status e dados de pagamento
      const dataPagamento = data_pagamento ? new Date(data_pagamento) : new Date();
      
      // Pegar o login do usuário autenticado (funcionário que está dando baixa)
      let coletorLogin = 'api';
      if (req.idacesso) {
        const userLogado = await User.findByPk(req.idacesso);
        if (userLogado && userLogado.login) {
          coletorLogin = userLogado.login;
        }
      }
      
      console.log('👤 Coletor (usuário autenticado):', coletorLogin);
      
      invoice.status = 'pago';
      invoice.datapag = dataPagamento;
      invoice.coletor = coletorLogin;
      invoice.formapag = formapag || 'dinheiro';
      // NOTA: Campos abaixo comentados até executar migrations
      // invoice.formapag = formapag;
      // invoice.acrescimo = valorAcrescimo;
      // invoice.multa_mora = valorMultaMora;
      // invoice.desconto = valorDesconto;
      // invoice.valor_pago = valor_pago ? parseFloat(valor_pago) : valorFinal;

      // Salvar dados específicos de pagamento (quando migrations forem executadas)
      // if (formapag === 'cartao' || formapag === 'Cartao') {
      //   invoice.cartao_bandeira = cartao_bandeira || null;
      //   invoice.cartao_numero = cartao_numero || null;
      // }

      // if (formapag === 'cheque') {
      //   invoice.cheque_banco = cheque_banco || null;
      //   invoice.cheque_numero = cheque_numero || null;
      //   invoice.cheque_agcc = cheque_agcc || null;
      // }

      await invoice.save();

      console.log('✅ Fatura paga com sucesso:', invoice.id);

      // TODO: Implementar lógica de juros para próxima mensalidade
      if (insnext === 'sim' && (valorMultaMora > 0 || valorAcrescimo > 0)) {
        console.log('⚠️ TODO: Adicionar juros na próxima mensalidade');
        // Lógica para criar lançamento adicional na próxima fatura
      }

      // TODO: Implementar integração com EfiPay
      if (excluir_efipay === 's') {
        console.log('⚠️ TODO: Excluir título na EfiPay');
        // Chamar API da EfiPay para cancelar o título
      }

      return res.json({
        success: true,
        message: 'Fatura paga com sucesso',
        invoice: {
          id: invoice.id,
          uuid_lanc: invoice.uuid_lanc,
          login: invoice.login,
          valor: invoice.valor,
          valor_pago: valor_pago || valorFinal,
          acrescimo: valorAcrescimo,
          multa_mora: valorMultaMora,
          desconto: valorDesconto,
          formapag: formapag,
          status: invoice.status,
          datavenc: invoice.datavenc,
          datapag: invoice.datapag,
          tipo: invoice.tipo,
          obs: invoice.obs,
          _nota: 'Campos financeiros serão salvos após execução das migrations'
        }
      });
    } catch (error) {
      console.error('❌ Erro ao dar baixa na fatura:', error);
      return res.status(500).json({ 
        error: 'Erro ao dar baixa na fatura',
        details: error.message 
      });
    }
  }
}

export default new InvoiceController();
