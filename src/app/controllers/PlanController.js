import Plan from '../schemas/Plan';
import Tenant from '../schemas/Tenant';
import Subscription from '../schemas/Subscription';

class PlanController {
  // Listar todos os planos disponíveis (público)
  async index(req, res) {
    try {
      const { active_only } = req.query;
      
      const filter = active_only === 'true' ? { ativo: true } : {};
      const plans = await Plan.find(filter).sort({ ordem: 1, valor: 1 });

      return res.json(plans);
    } catch (error) {
      console.error('Error listing plans:', error);
      return res.status(500).json({ error: 'Erro ao listar planos' });
    }
  }

  // Obter detalhes de um plano específico
  async show(req, res) {
    try {
      const { id } = req.params;
      const plan = await Plan.findById(id);

      if (!plan) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }

      return res.json(plan);
    } catch (error) {
      console.error('Error getting plan:', error);
      return res.status(500).json({ error: 'Erro ao obter plano' });
    }
  }

  // Criar novo plano (admin)
  async create(req, res) {
    try {
      const {
        nome,
        slug,
        descricao,
        valor,
        limite_clientes,
        recorrente,
        periodo,
        recursos,
        destaque,
        cor,
        dias_trial,
      } = req.body;

      // Verificar se slug já existe
      const existingPlan = await Plan.findOne({ slug });
      if (existingPlan) {
        return res.status(400).json({ error: 'Já existe um plano com esse identificador' });
      }

      const plan = await Plan.create({
        nome,
        slug,
        descricao,
        valor,
        limite_clientes: limite_clientes || null,
        recorrente: recorrente !== false,
        periodo: periodo || 'mensal',
        recursos: recursos || [],
        destaque: destaque || false,
        cor: cor || '#6366f1',
        dias_trial: dias_trial || 7,
        ordem: await Plan.countDocuments(),
      });

      return res.status(201).json({
        message: 'Plano criado com sucesso',
        plan,
      });
    } catch (error) {
      console.error('Error creating plan:', error);
      return res.status(500).json({ error: 'Erro ao criar plano' });
    }
  }

  // Atualizar plano (admin)
  async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const plan = await Plan.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!plan) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }

      return res.json({
        message: 'Plano atualizado com sucesso',
        plan,
      });
    } catch (error) {
      console.error('Error updating plan:', error);
      return res.status(500).json({ error: 'Erro ao atualizar plano' });
    }
  }

  // Deletar plano (admin)
  async delete(req, res) {
    try {
      const { id } = req.params;

      // Verificar se há tenants usando este plano
      const tenantsCount = await Tenant.countDocuments({ 'assinatura.plano_id': id });
      
      if (tenantsCount > 0) {
        return res.status(400).json({ 
          error: `Não é possível deletar. ${tenantsCount} cliente(s) usando este plano.`,
          tenants_count: tenantsCount,
        });
      }

      const plan = await Plan.findByIdAndDelete(id);

      if (!plan) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }

      return res.json({
        message: 'Plano deletado com sucesso',
      });
    } catch (error) {
      console.error('Error deleting plan:', error);
      return res.status(500).json({ error: 'Erro ao deletar plano' });
    }
  }

  // Toggle ativo/inativo
  async toggleActive(req, res) {
    try {
      const { id } = req.params;

      const plan = await Plan.findById(id);
      if (!plan) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }

      plan.ativo = !plan.ativo;
      await plan.save();

      return res.json({
        message: `Plano ${plan.ativo ? 'ativado' : 'desativado'} com sucesso`,
        plan,
      });
    } catch (error) {
      console.error('Error toggling plan:', error);
      return res.status(500).json({ error: 'Erro ao alterar status do plano' });
    }
  }

  // Atualizar plano de um tenant
  async updateTenantPlan(req, res) {
    try {
      const { tenantId } = req.params;
      const { plan_id } = req.body;

      const plan = await Plan.findById(plan_id);
      if (!plan) {
        return res.status(400).json({ error: 'Plano inválido' });
      }

      if (!plan.ativo) {
        return res.status(400).json({ error: 'Este plano não está mais disponível' });
      }

      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant não encontrado' });
      }

      // Atualizar dados do plano
      tenant.assinatura.plano_id = plan._id;
      tenant.assinatura.plano = plan.slug;
      tenant.assinatura.plano_nome = plan.nome;
      tenant.assinatura.valor = plan.valor;
      tenant.assinatura.limite_clientes = plan.limite_clientes;
      tenant.assinatura.recorrente = plan.recorrente;

      // Se for plano vitalício, não tem vencimento
      if (plan.periodo === 'vitalicio') {
        tenant.assinatura.status = 'ativa';
        tenant.assinatura.data_vencimento = new Date('2099-12-31');
        tenant.assinatura.recorrente = false;
        tenant.status = 'ativo';
      } else {
        // Calcular próximo vencimento baseado no período
        const hoje = new Date();
        let proximoVencimento = new Date(hoje);
        
        switch(plan.periodo) {
          case 'mensal':
            proximoVencimento.setMonth(proximoVencimento.getMonth() + 1);
            break;
          case 'trimestral':
            proximoVencimento.setMonth(proximoVencimento.getMonth() + 3);
            break;
          case 'semestral':
            proximoVencimento.setMonth(proximoVencimento.getMonth() + 6);
            break;
          case 'anual':
            proximoVencimento.setFullYear(proximoVencimento.getFullYear() + 1);
            break;
        }
        
        tenant.assinatura.data_vencimento = proximoVencimento;
      }

      await tenant.save();

      // Criar assinatura automaticamente
      try {
        // Verificar se já existe uma assinatura ativa
        const existingSubscription = await Subscription.findOne({
          tenantId: tenant._id.toString(),
          status: { $in: ['active', 'trial'] }
        });

        if (existingSubscription) {
          // Atualizar assinatura existente
          existingSubscription.planId = plan._id.toString();
          existingSubscription.amount = plan.valor;
          existingSubscription.nextBillingDate = tenant.assinatura.data_vencimento;
          existingSubscription.updatedAt = new Date();
          await existingSubscription.save();
          
          console.log('✅ Assinatura existente atualizada:', existingSubscription._id);
        } else {
          // Criar nova assinatura
          const newSubscription = await Subscription.create({
            tenantId: tenant._id.toString(),
            planId: plan._id.toString(),
            status: 'active',
            amount: plan.valor,
            startDate: new Date(),
            nextBillingDate: tenant.assinatura.data_vencimento,
            paymentStatus: 'pending',
            billingPeriod: plan.periodo || 'monthly',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          console.log('✅ Nova assinatura criada:', newSubscription._id);
        }
      } catch (subError) {
        console.error('⚠️ Erro ao criar/atualizar assinatura:', subError);
        // Não falha a operação principal, apenas loga o erro
      }

      return res.json({
        message: 'Plano atualizado com sucesso',
        tenant: {
          id: tenant._id,
          provedor: tenant.provedor.nome,
          plano: {
            id: tenant.assinatura.plano_id,
            nome: tenant.assinatura.plano_nome,
            valor: tenant.assinatura.valor,
            limite_clientes: tenant.assinatura.limite_clientes,
            vencimento: tenant.assinatura.data_vencimento,
          }
        }
      });
    } catch (error) {
      console.error('Error updating tenant plan:', error);
      return res.status(500).json({ error: 'Erro ao atualizar plano' });
    }
  }

  // Verificar se tenant excedeu limite do plano
  async checkClientLimit(req, res) {
    try {
      const { tenantId } = req.params;
      const { active_clients } = req.body;

      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant não encontrado' });
      }

      const limiteAtual = tenant.assinatura.limite_clientes;
      const isValid = !limiteAtual || active_clients <= limiteAtual;

      // Buscar próximo plano sugerido
      let sugestaoUpgrade = null;
      if (!isValid) {
        const planos = await Plan.find({ 
          ativo: true,
          $or: [
            { limite_clientes: null }, // ilimitado
            { limite_clientes: { $gte: active_clients } }
          ],
          valor: { $gt: tenant.assinatura.valor }
        }).sort({ valor: 1 }).limit(1);
        
        if (planos.length > 0) {
          sugestaoUpgrade = planos[0];
        }
      }

      return res.json({
        plano_atual: {
          id: tenant.assinatura.plano_id,
          nome: tenant.assinatura.plano_nome,
          limite: limiteAtual,
        },
        clientes_ativos: active_clients,
        dentro_do_limite: isValid,
        excedeu_em: !isValid ? active_clients - limiteAtual : 0,
        sugestao_upgrade: sugestaoUpgrade ? {
          id: sugestaoUpgrade._id,
          nome: sugestaoUpgrade.nome,
          valor: sugestaoUpgrade.valor,
          limite: sugestaoUpgrade.limite_clientes,
        } : null,
      });
    } catch (error) {
      console.error('Error checking client limit:', error);
      return res.status(500).json({ error: 'Erro ao verificar limite' });
    }
  }

  // Calcular valor com desconto para upgrade
  async calculateUpgrade(req, res) {
    try {
      const { tenantId, novo_plano_id } = req.body;

      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant não encontrado' });
      }

      const planoAtual = await Plan.findById(tenant.assinatura.plano_id);
      const novoPlano = await Plan.findById(novo_plano_id);

      if (!novoPlano) {
        return res.status(400).json({ error: 'Plano inválido' });
      }

      // Calcular dias restantes da assinatura atual
      const hoje = new Date();
      const vencimento = new Date(tenant.assinatura.data_vencimento);
      const diasRestantes = Math.max(0, Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24)));
      
      // Calcular crédito proporcional apenas se for recorrente
      let creditoProporcional = 0;
      if (planoAtual && planoAtual.recorrente && tenant.assinatura.recorrente) {
        const diasPeriodo = planoAtual.periodo === 'mensal' ? 30 : 
                           planoAtual.periodo === 'trimestral' ? 90 :
                           planoAtual.periodo === 'semestral' ? 180 :
                           planoAtual.periodo === 'anual' ? 365 : 30;
        
        creditoProporcional = (planoAtual.valor / diasPeriodo) * diasRestantes;
      }

      const valorFinal = Math.max(0, novoPlano.valor - creditoProporcional);

      return res.json({
        plano_atual: planoAtual ? {
          id: planoAtual._id,
          nome: planoAtual.nome,
          valor: planoAtual.valor,
        } : null,
        novo_plano: {
          id: novoPlano._id,
          nome: novoPlano.nome,
          valor: novoPlano.valor,
        },
        dias_restantes: diasRestantes,
        credito_proporcional: parseFloat(creditoProporcional.toFixed(2)),
        valor_final: parseFloat(valorFinal.toFixed(2)),
        economia: parseFloat(creditoProporcional.toFixed(2)),
      });
    } catch (error) {
      console.error('Error calculating upgrade:', error);
      return res.status(500).json({ error: 'Erro ao calcular upgrade' });
    }
  }

  // Seed inicial de planos (executar uma vez)
  async seed(req, res) {
    try {
      const existingPlans = await Plan.countDocuments();
      
      if (existingPlans > 0) {
        return res.status(400).json({ 
          error: 'Já existem planos cadastrados',
          count: existingPlans,
        });
      }

      const defaultPlans = [
        {
          nome: 'Plano Básico',
          slug: 'basico',
          descricao: 'Perfeito para começar',
          valor: 150.00,
          limite_clientes: 1000,
          recorrente: true,
          periodo: 'mensal',
          recursos: [
            'Até 1000 clientes ativos',
            'Dashboard completo',
            'Gestão de tickets',
            'Notificações WhatsApp',
            'Pagamentos via PIX',
            'Suporte via chat',
          ],
          ativo: true,
          ordem: 1,
          cor: '#3b82f6',
          dias_trial: 7,
        },
        {
          nome: 'Plano Premium',
          slug: 'premium',
          descricao: 'Para provedores em crescimento',
          valor: 200.00,
          limite_clientes: null,
          recorrente: true,
          periodo: 'mensal',
          recursos: [
            'Clientes ilimitados',
            'Dashboard completo',
            'Gestão de tickets avançada',
            'Notificações WhatsApp',
            'Pagamentos via PIX e Boleto',
            'API completa',
            'Suporte prioritário',
            'Relatórios avançados',
          ],
          ativo: true,
          destaque: true,
          ordem: 2,
          cor: '#8b5cf6',
          dias_trial: 7,
        },
        {
          nome: 'Plano Vitalício',
          slug: 'vitalicio',
          descricao: 'Melhor custo-benefício',
          valor: 1800.00,
          limite_clientes: null,
          recorrente: false,
          periodo: 'vitalicio',
          recursos: [
            'Clientes ilimitados',
            'Dashboard completo',
            'Gestão de tickets premium',
            'Notificações WhatsApp',
            'Pagamentos via PIX e Boleto',
            'API completa',
            'Suporte vitalício prioritário',
            'Todas as atualizações futuras',
            'Sem mensalidades',
            'Economia de R$ 2.400/ano',
          ],
          ativo: true,
          destaque: true,
          ordem: 3,
          cor: '#10b981',
          dias_trial: 0,
        },
      ];

      const plans = await Plan.insertMany(defaultPlans);

      return res.json({
        message: 'Planos padrão criados com sucesso',
        count: plans.length,
        plans,
      });
    } catch (error) {
      console.error('Error seeding plans:', error);
      return res.status(500).json({ error: 'Erro ao criar planos padrão' });
    }
  }
}

export default new PlanController();
