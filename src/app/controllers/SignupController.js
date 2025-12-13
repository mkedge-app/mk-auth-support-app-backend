import { addDays } from 'date-fns';
import bcrypt from 'bcryptjs';
import Tenant from '../schemas/Tenant';
import Subscription from '../schemas/Subscription';
import Plan from '../schemas/Plan';
import NotificationService from '../services/NotificationService';

class SignupController {
  async store(req, res) {
    try {
      const { empresa, cnpj, responsavel, contato, email, senha } = req.body;

      // Validações
      if (!empresa || !cnpj || !responsavel || !contato || !email || !senha) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
      }

      // Verifica se já existe tenant com este CNPJ
      const tenantExists = await Tenant.findOne({ cnpj });
      if (tenantExists) {
        return res.status(400).json({ error: 'Este CNPJ já está cadastrado' });
      }

      // Verifica se já existe tenant com este email
      const emailExists = await Tenant.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ error: 'Este e-mail já está cadastrado' });
      }

      // Hash da senha
      const senhaHash = await bcrypt.hash(senha, 8);

      // Buscar plano básico para trial
      let planoBasico = await Plan.findOne({ nome: 'Básico' });
      if (!planoBasico) {
        // Se não existe, criar plano básico padrão
        planoBasico = await Plan.create({
          nome: 'Básico',
          descricao: 'Plano básico para período de teste',
          valor: 100,
          limite_clientes: 1000,
          recursos: {
            chamados_ilimitados: true,
            app_tecnico: true,
            whatsapp_integrado: false,
            relatorios: true,
            suporte: 'email'
          },
          ativo: true,
          recorrente: true
        });
      }

      // Data de início e fim do trial (7 dias)
      const dataInicio = new Date();
      const dataFimTrial = addDays(dataInicio, 7);

      // Criar tenant
      const tenant = await Tenant.create({
        cnpj,
        responsavel,
        contato,
        email,
        senha: senhaHash,
        cortesia: false, // Clientes com cortesia=true não precisam de assinatura/pagamento
        provedor: {
          nome: empresa,
          sis_provedor: empresa
        },
        database: {
          host: null, // Cliente configura depois
          name: null,
          dialect: 'mysql',
          username: null,
          password: null
        },
        assinatura: {
          plano_id: planoBasico._id,
          plano: planoBasico.nome,
          plano_nome: planoBasico.nome,
          valor: planoBasico.valor,
          status: 'trial',
          ativa: true,
          limite_clientes: planoBasico.limite_clientes,
          recorrente: true,
          data_inicio: dataInicio,
          data_vencimento: dataFimTrial,
          dia_vencimento: dataFimTrial.getDate()
        },
        status: 'trial',
        notificacoes: {
          whatsapp_enabled: true,  // Habilitado por padrão para receber notificações
          email_enabled: true
        }
      });

      // Criar subscription automática
      const subscription = await Subscription.create({
        tenant_id: tenant._id,
        plano_id: planoBasico._id,
        plano: planoBasico.nome,
        valor: planoBasico.valor,
        status: 'trial',
        trial_start: dataInicio,
        trial_end: dataFimTrial,
        data_inicio: dataInicio,
        proximo_vencimento: dataFimTrial,
        dia_vencimento: dataFimTrial.getDate(),
        metodo_pagamento: 'pix',
        recorrente: true,
        limite_clientes: planoBasico.limite_clientes
      });

      console.log(`✅ Nova conta criada: ${empresa} (${cnpj})`);
      console.log(`📅 Trial até: ${dataFimTrial.toLocaleDateString('pt-BR')}`);

      // Enviar mensagem de boas-vindas (assíncrono, não bloqueia resposta)
      if (contato) {
        NotificationService.sendWelcome(tenant).catch(err => {
          console.error('❌ Erro ao enviar boas-vindas:', err);
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Conta criada com sucesso! Você tem 7 dias de teste grátis.',
        tenant: {
          id: tenant._id,
          empresa: tenant.provedor.nome,
          cnpj: tenant.cnpj,
          email: tenant.email,
          trial_end: dataFimTrial,
          dias_restantes: 7
        },
        subscription: {
          id: subscription._id,
          status: 'trial',
          valor: subscription.valor,
          proximo_vencimento: dataFimTrial
        }
      });

    } catch (error) {
      console.error('❌ Erro ao criar conta:', error);
      return res.status(500).json({ 
        error: 'Erro ao criar conta',
        details: error.message 
      });
    }
  }
}

export default new SignupController();
