import { isValidObjectId } from 'mongoose';
import { resolveDbConnection, connectNewTenantsDB, tenantDatabaseConnections } from '../middlewares/connectionResolver';
import Tenant from '../schemas/Tenant';
import SisOpcao from '../models/SisOpcao';

class ProviderController {
  async index(req, res) {
    try {
      const tenants = await Tenant.find();

    for (const [index, tenant] of tenants.entries()) {
      let dbStatus = false;
      try {
        dbStatus = await resolveDbConnection(tenant);
      } catch (error) {
        console.log(`Erro ao conectar DB do tenant ${tenant.provedor.nome}:`, error.message);
        dbStatus = false;
      }

      tenants[index] = {
        _id: tenant.id,
        id: tenant.id,
        cnpj: tenant.cnpj,
        email: tenant.email || '',
        responsavel: tenant.responsavel,
        contato: tenant.contato,
        status: tenant.status || 'inativo',
        provedor: {
          nome: tenant.provedor.nome,
          sis_provedor: tenant.provedor.sis_provedor || tenant.provedor.nome,
          nome_provedor: tenant.provedor.nome,
        },
        google_maps_api_key: tenant.google_maps_api_key || null,
        database: {
          conectado: dbStatus,
          host: tenant.database?.host || null,
          name: tenant.database?.name || null,
          dialect: tenant.database?.dialect || null,
          username: tenant.database?.username || null,
        },
        assinatura: {
          plano_id: tenant.assinatura?.plano_id || null,
          status: tenant.assinatura?.status || 'inativa',
          ativa: tenant.assinatura?.ativa || false,
          plano: tenant.assinatura?.plano || 'basico',
          plano_nome: tenant.assinatura?.plano_nome || 'Plano Básico',
          valor: tenant.assinatura.valor,
          limite_clientes: tenant.assinatura?.limite_clientes || null,
          recorrente: tenant.assinatura?.recorrente !== false,
          data_vencimento: tenant.assinatura.data_vencimento,
          dia_vencimento: tenant.assinatura.dia_vencimento
        }
      }
    }

    return res.json(tenants);
    } catch (error) {
      console.error('Erro ao listar provedores:', error);
      return res.status(500).json({ error: 'Erro ao listar provedores' });
    }
  }

  async create(req, res) {
    try {
      const { cnpj, responsavel, contato } = req.body;
      const { provedor, database, assinatura } = req.body;

      const tenantExists = await Tenant.findOne({ cnpj });

    if (tenantExists) {
      return res.status(400).json({
        error: 'Falha ao cadastrar',
        message: 'Já existe um registro para este CNPJ'
      });
    }

    const tenant = await Tenant.create({
      cnpj: cnpj,
      responsavel: responsavel,
      contato: contato,
      provedor: {
        nome: provedor.nome
      },
      database: {
        name: database.name,
        dialect: database.dialect,
        host: database.host,
        username: database.username,
        password: database.password
      },
      assinatura: {
        valor: assinatura.valor,
        data_vencimento: assinatura.data_vencimento,
        dia_vencimento: assinatura.dia_vencimento
      }
    });

    return res.json({
      id: tenant.id,
      cnpj: tenant.cnpj,
      responsavel: tenant.responsavel,
      contato: tenant.contato,
      provedor: {
        nome: tenant.provedor.nome
      },
      database: {
        conectado: false
      },
      assinatura: {
        ativa: false,
        valor: tenant.assinatura.valor,
        data_vencimento: tenant.assinatura.data_vencimento,
        dia_vencimento: tenant.assinatura.dia_vencimento
      }
    });
    } catch (error) {
      console.error('Erro ao criar provedor:', error);
      return res.status(500).json({ 
        error: 'Erro ao criar provedor',
        message: error.message 
      });
    }
  }

  async update(req, res) {
    try {
      const { tenant_id } = req.params;

      const isValidTenantId = isValidObjectId(tenant_id);

    if (!isValidTenantId) {
      return res.status(400).json({
        error: 'Id inválido',
        message: 'O id informado não é válido'
      });
    }

    const tenant = await Tenant.findById(tenant_id);

    if (!tenant) {
      return res.status(400).json({
        error: 'Id desconhecido',
        message: 'O id informado não está associado a nenhum registro'
      });
    }

    tenant.cnpj = req.body?.cnpj ? req.body.cnpj : tenant.cnpj;
    tenant.email = req.body?.email !== undefined ? req.body.email : tenant.email;
    tenant.responsavel = req.body?.responsavel ? req.body.responsavel : tenant.responsavel;
    tenant.contato = req.body?.contato ? req.body.contato : tenant.contato;
    tenant.status = req.body?.status ? req.body.status : tenant.status;
    tenant.cortesia = req.body?.cortesia !== undefined ? req.body.cortesia : tenant.cortesia;
    
    console.log('=== UPDATE TENANT DEBUG ===');
    console.log('Body cortesia:', req.body?.cortesia);
    console.log('Tenant cortesia after:', tenant.cortesia);

    tenant.provedor.nome = req.body?.provedor?.nome ? req.body.provedor.nome : tenant.provedor.nome;

    tenant.database.name = req.body?.database?.name ? req.body.database.name : tenant.database.name;
    tenant.database.dialect = req.body?.database?.dialect ? req.body.database.dialect : tenant.database.dialect;
    tenant.database.host = req.body?.database?.host ? req.body.database.host : tenant.database.host;
    tenant.database.username = req.body?.database?.username ? req.body.database.username : tenant.database.username;
    
    // Atualizar senha do banco apenas se foi fornecida
    if (req.body?.database?.password) {
      tenant.database.password = req.body.database.password;
    }

    // Atualizar plano se fornecido
    if (req.body?.plano_id !== undefined) {
      if (req.body.plano_id === '' || req.body.plano_id === null) {
        // Remover plano
        tenant.assinatura.plano_id = null;
      } else {
        // Atribuir novo plano
        tenant.assinatura.plano_id = req.body.plano_id;
      }
    }

    tenant.assinatura.valor = req.body?.assinatura?.valor ? req.body.assinatura.valor : tenant.assinatura.valor;
    tenant.assinatura.data_vencimento = req.body?.assinatura?.data_vencimento ? req.body.assinatura.data_vencimento : tenant.assinatura.data_vencimento;
    tenant.assinatura.dia_vencimento = req.body?.assinatura?.dia_vencimento ? req.body.assinatura.dia_vencimento : tenant.assinatura.dia_vencimento;


    await tenant.save();

    const dbStatus = await resolveDbConnection(tenant);

    return res.json({
      id: tenant.id,
      cnpj: tenant.cnpj,
      responsavel: tenant.responsavel,
      contato: tenant.contato,
      provedor: {
        nome: tenant.provedor.nome
      },
      database: {
        conectado: dbStatus
      },
      assinatura: {
        ativa: false,
        valor: tenant.assinatura.valor,
        data_vencimento: tenant.assinatura.data_vencimento,
        dia_vencimento: tenant.assinatura.dia_vencimento
      }
    });
    } catch (error) {
      console.error('Erro ao atualizar provedor:', error);
      return res.status(500).json({ 
        error: 'Erro ao atualizar provedor',
        message: error.message 
      });
    }
  }

  async show(req, res) {
    // Se vier tenant_id do params, usa o antigo comportamento
    // Se vier tenant_id da query (ConnectionResolver), usa para buscar o tenant
    const tenant_id = req.params.tenant_id || req.query.tenant_id;

    if (!tenant_id) {
      return res.status(400).json({
        error: 'Tenant ID não fornecido',
        message: 'É necessário fornecer o tenant_id'
      });
    }

    const isValidTenantId = isValidObjectId(tenant_id);

    if (!isValidTenantId) {
      return res.status(400).json({
        error: 'Id inválido',
        message: 'O id informado não é válido'
      });
    }

    const tenant = await Tenant.findById(tenant_id);

    const dbStatus = await resolveDbConnection(tenant);
    
    // Buscar chave do Google Maps da tabela sis_opcao
    let googleMapsKey = tenant.google_maps_api_key || null;
    try {
      const opcao = await SisOpcao.findOne({
        where: { nome: 'key_googlemaps' },
        attributes: ['valor'],
        raw: true,
      });
      if (opcao && opcao.valor) {
        googleMapsKey = opcao.valor;
      }
    } catch (error) {
      // Se der erro, usa o valor do tenant ou null
    }

    return res.json({
      _id: tenant.id,
      id: tenant.id,
      cnpj: tenant.cnpj,
      email: tenant.email || '',
      responsavel: tenant.responsavel,
      contato: tenant.contato,
      status: tenant.status || 'inativo',
      cortesia: tenant.cortesia || false,
      provedor: {
        nome: tenant.provedor.nome,
        sis_provedor: tenant.provedor.sis_provedor || tenant.provedor.nome,
        nome_provedor: tenant.provedor.nome,
      },
      google_maps_api_key: googleMapsKey,
      database: {
        conectado: dbStatus,
        name: tenant.database.name,
        dialect: tenant.database.dialect,
        host: tenant.database.host,
        username: tenant.database.username,
        password: tenant.database.password,
      },
      assinatura: {
        plano_id: tenant.assinatura?.plano_id || null,
        status: tenant.assinatura?.status || 'inativa',
        ativa: tenant.assinatura?.ativa || false,
        plano: tenant.assinatura?.plano || 'basico',
        plano_nome: tenant.assinatura?.plano_nome || 'Plano Básico',
        valor: tenant.assinatura.valor,
        limite_clientes: tenant.assinatura?.limite_clientes || null,
        recorrente: tenant.assinatura?.recorrente !== false,
        data_vencimento: tenant.assinatura.data_vencimento,
        dia_vencimento: tenant.assinatura.dia_vencimento
      }
    });
  }

  // Ativar tenant (habilitar acesso ao sistema)
  async activate(req, res) {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const tenant = await Tenant.findById(id);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant não encontrado' });
    }

    // ✅ Verificar se tem plano vinculado ou cortesia
    if (!tenant.assinatura.plano_id && !tenant.cortesia) {
      return res.status(400).json({
        error: 'Tenant não possui plano vinculado nem cortesia',
        message: 'É necessário vincular um plano ou marcar como cortesia antes de ativar o tenant',
        action_required: 'assign_plan_or_courtesy'
      });
    }

    // ✅ Se for cortesia, pular verificações de vencimento e trial
    if (!tenant.cortesia) {
      // ✅ Verificar se a assinatura não está vencida (apenas para não-cortesia)
      const hoje = new Date();
      const dataVencimento = new Date(tenant.assinatura.data_vencimento);
      
      if (dataVencimento < hoje && tenant.assinatura.recorrente) {
        return res.status(400).json({
          error: 'Assinatura vencida',
          message: `Assinatura venceu em ${dataVencimento.toLocaleDateString('pt-BR')}`,
          data_vencimento: dataVencimento,
          action_required: 'renew_subscription'
        });
      }

      // ✅ Verificar se está em trial expirado (apenas para não-cortesia)
      if (tenant.assinatura.status === 'trial_expirado') {
        return res.status(400).json({
          error: 'Trial expirado',
          message: 'O período de trial expirou. É necessário ativar uma assinatura paga.',
          action_required: 'activate_paid_subscription'
        });
      }
    }

    // ✅ Ativar tenant e assinatura
    tenant.assinatura.ativa = true;
    tenant.assinatura.status = tenant.assinatura.recorrente ? 'active' : 'ativa';
    tenant.status = 'ativo';
    
    // Se ainda está em trial, manter status trial
    if (tenant.assinatura.trial_ends_at && new Date(tenant.assinatura.trial_ends_at) > hoje) {
      tenant.assinatura.status = 'trial';
    }
    
    await tenant.save();

    // Aguardar 1 segundo antes de conectar o banco
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Conectar o banco automaticamente
    let dbStatus = false;
    try {
      await connectNewTenantsDB(tenant);
      dbStatus = await resolveDbConnection(tenant);
    } catch (error) {
      console.log(`Erro ao conectar DB do tenant ${tenant.provedor.nome}:`, error.message);
    }

    return res.json({
      message: 'Tenant ativado e banco de dados conectado com sucesso',
      tenant: {
        id: tenant.id,
        nome: tenant.provedor.nome,
        status: tenant.status,
        assinatura: {
          ativa: tenant.assinatura.ativa,
          status: tenant.assinatura.status,
          plano: tenant.assinatura.plano_nome,
          valor: tenant.assinatura.valor,
          vencimento: tenant.assinatura.data_vencimento
        },
        database: {
          conectado: dbStatus
        }
      }
    });
  }

  // Desativar tenant (bloquear acesso ao sistema)
  async deactivate(req, res) {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const tenant = await Tenant.findById(id);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant não encontrado' });
    }

    // Atualizar status da assinatura
    tenant.assinatura.ativa = false;
    tenant.assinatura.status = 'suspended';
    tenant.status = 'inativo';
    await tenant.save();

    // Desconectar o banco de dados
    const connection = tenantDatabaseConnections[tenant.id];
    if (connection) {
      try {
        await connection.close();
        delete tenantDatabaseConnections[tenant.id];
      } catch (error) {
        console.log(`Erro ao desconectar DB do tenant ${tenant.provedor.nome}:`, error.message);
      }
    }

    return res.json({
      message: 'Tenant desativado e banco de dados desconectado com sucesso',
      tenant: {
        id: tenant.id,
        nome: tenant.provedor.nome,
        status: tenant.status,
        assinatura: {
          ativa: tenant.assinatura.ativa,
          status: tenant.assinatura.status
        },
        database: {
          conectado: false
        }
      }
    });
  }

  // Conectar banco de dados do tenant
  async connectDatabase(req, res) {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const tenant = await Tenant.findById(id);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant não encontrado' });
    }

    // Testar conexão com o banco
    const dbStatus = await resolveDbConnection(tenant);

    if (!dbStatus) {
      return res.status(400).json({
        error: 'Falha ao conectar',
        message: 'Não foi possível conectar ao banco de dados. Verifique as credenciais.'
      });
    }

    return res.json({
      message: 'Banco de dados conectado com sucesso',
      tenant: {
        id: tenant.id,
        nome: tenant.provedor.nome,
        database: {
          conectado: true,
          name: tenant.database.name
        }
      }
    });
  }

  // Desconectar banco de dados do tenant
  async disconnectDatabase(req, res) {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const tenant = await Tenant.findById(id);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant não encontrado' });
    }

    return res.json({
      message: 'Banco de dados desconectado',
      tenant: {
        id: tenant.id,
        nome: tenant.provedor.nome,
        database: {
          conectado: false
        }
      }
    });
  }

  // Sincronizar status do tenant com base na assinatura
  async syncStatusWithSubscription(req, res) {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const tenant = await Tenant.findById(id);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant não encontrado' });
    }

    // Lógica de sincronização baseada no status da assinatura
    const assinaturaStatus = tenant.assinatura?.status || 'inativa';
    const dataVencimento = tenant.assinatura?.data_vencimento;
    const trialEndsAt = tenant.assinatura?.trial_ends_at;
    const hoje = new Date();

    let novoStatus = 'inativo';
    let novoAssinaturaStatus = assinaturaStatus;
    let mensagem = '';

    // ✅ Verificar se tem plano vinculado
    if (!tenant.assinatura.plano_id) {
      novoStatus = 'inativo';
      novoAssinaturaStatus = 'inativa';
      tenant.assinatura.ativa = false;
      mensagem = 'Sem plano vinculado - Tenant desativado';
    }
    // ✅ Verificar trial
    else if (trialEndsAt) {
      const trialDate = new Date(trialEndsAt);
      if (trialDate > hoje) {
        // Trial válido
        novoStatus = 'ativo';
        novoAssinaturaStatus = 'trial';
        tenant.assinatura.ativa = true;
        const diasRestantes = Math.ceil((trialDate - hoje) / (1000 * 60 * 60 * 24));
        mensagem = `Em trial - ${diasRestantes} dias restantes`;
      } else {
        // Trial expirado
        novoStatus = 'inativo';
        novoAssinaturaStatus = 'trial_expirado';
        tenant.assinatura.ativa = false;
        mensagem = 'Trial expirado - Necessário ativar assinatura paga';
      }
    }
    // ✅ Verificar assinatura ativa/vencida
    else if (assinaturaStatus === 'active' || assinaturaStatus === 'ativa') {
      if (dataVencimento && new Date(dataVencimento) < hoje && tenant.assinatura.recorrente) {
        // Vencida (apenas para assinaturas recorrentes)
        novoStatus = 'inativo';
        novoAssinaturaStatus = 'vencida';
        tenant.assinatura.ativa = false;
        const diasVencidos = Math.ceil((hoje - new Date(dataVencimento)) / (1000 * 60 * 60 * 24));
        mensagem = `Assinatura vencida há ${diasVencidos} dias - Tenant desativado`;
      } else {
        // Em dia ou vitalício
        novoStatus = 'ativo';
        novoAssinaturaStatus = 'active';
        tenant.assinatura.ativa = true;
        if (tenant.assinatura.recorrente) {
          mensagem = 'Assinatura ativa - Tenant funcionando';
        } else {
          mensagem = 'Assinatura vitalícia - Tenant funcionando';
        }
      }
    }
    // ✅ Assinaturas suspensas/canceladas
    else if (assinaturaStatus === 'suspended' || assinaturaStatus === 'suspensa') {
      novoStatus = 'suspenso';
      tenant.assinatura.ativa = false;
      mensagem = 'Assinatura suspensa - Tenant bloqueado';
    }
    else if (assinaturaStatus === 'cancelled' || assinaturaStatus === 'cancelada') {
      novoStatus = 'inativo';
      novoAssinaturaStatus = 'cancelada';
      tenant.assinatura.ativa = false;
      mensagem = 'Assinatura cancelada - Tenant desativado';
    }
    else {
      // Status desconhecido ou inativo
      novoStatus = 'inativo';
      tenant.assinatura.ativa = false;
      mensagem = 'Status indefinido - Tenant desativado';
    }

    // Atualizar status
    tenant.status = novoStatus;
    tenant.assinatura.status = novoAssinaturaStatus;
    await tenant.save();

    // Desconectar banco se desativado
    if (novoStatus !== 'ativo') {
      const connection = tenantDatabaseConnections[tenant.id];
      if (connection) {
        try {
          await connection.close();
          delete tenantDatabaseConnections[tenant.id];
        } catch (error) {
          console.log(`Erro ao desconectar DB: ${error.message}`);
        }
      }
    }

    // Testar conexão do banco se ativo
    let dbStatus = false;
    if (novoStatus === 'ativo') {
      dbStatus = await resolveDbConnection(tenant);
    }

    return res.json({
      message: mensagem,
      tenant: {
        id: tenant.id,
        nome: tenant.provedor.nome,
        status: tenant.status,
        assinatura: {
          status: tenant.assinatura.status,
          ativa: tenant.assinatura.ativa,
          plano: tenant.assinatura.plano_nome,
          vencimento: tenant.assinatura.data_vencimento,
          trial_ate: tenant.assinatura.trial_ends_at,
        },
        database_conectado: dbStatus,
      }
    });
  }

  // ✅ NOVO: Verificar e atualizar status de TODOS os tenants automaticamente
  async syncAllTenants(req, res) {
    try {
      const tenants = await Tenant.find({});
      const hoje = new Date();
      
      const resultados = {
        total: tenants.length,
        atualizados: 0,
        desativados: 0,
        trial_expirados: 0,
        vencidos: 0,
        ativos: 0,
      };

      for (const tenant of tenants) {
        const statusAnterior = tenant.status;
        
        // Lógica similar ao syncStatusWithSubscription
        const trialEndsAt = tenant.assinatura?.trial_ends_at;
        const dataVencimento = tenant.assinatura?.data_vencimento;
        
        let novoStatus = tenant.status;
        let novoAssinaturaStatus = tenant.assinatura.status;
        let atualizado = false;

        // Verificar trial expirado
        if (trialEndsAt && new Date(trialEndsAt) < hoje && tenant.assinatura.status === 'trial') {
          novoStatus = 'inativo';
          novoAssinaturaStatus = 'trial_expirado';
          tenant.assinatura.ativa = false;
          resultados.trial_expirados++;
          atualizado = true;
        }
        // Verificar vencimento
        else if (dataVencimento && new Date(dataVencimento) < hoje && tenant.assinatura.recorrente) {
          if (tenant.assinatura.status === 'active' || tenant.assinatura.status === 'ativa') {
            novoStatus = 'inativo';
            novoAssinaturaStatus = 'vencida';
            tenant.assinatura.ativa = false;
            resultados.vencidos++;
            atualizado = true;
          }
        }
        // Contar ativos
        else if (tenant.status === 'ativo' && tenant.assinatura.ativa) {
          resultados.ativos++;
        }

        if (atualizado) {
          tenant.status = novoStatus;
          tenant.assinatura.status = novoAssinaturaStatus;
          await tenant.save();
          resultados.atualizados++;
          
          if (novoStatus === 'inativo') {
            resultados.desativados++;
          }

          console.log(`✅ Tenant ${tenant.provedor.nome} atualizado: ${statusAnterior} → ${novoStatus}`);
        }
      }

      return res.json({
        message: 'Sincronização de todos os tenants concluída',
        resultados,
      });
    } catch (error) {
      console.error('Erro ao sincronizar tenants:', error);
      return res.status(500).json({ error: 'Erro ao sincronizar tenants' });
    }
  }

  async delete(req, res) {
    try {
      const { tenant_id } = req.params;

      if (!isValidObjectId(tenant_id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }

      const tenant = await Tenant.findById(tenant_id);

      if (!tenant) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      // Deletar o tenant
      await Tenant.findByIdAndDelete(tenant_id);

      return res.json({
        message: 'Cliente deletado com sucesso',
        deleted: {
          id: tenant_id,
          nome: tenant.provedor.nome
        }
      });
    } catch (error) {
      console.error('Erro ao deletar tenant:', error);
      return res.status(500).json({ error: 'Erro ao deletar cliente' });
    }
  }
}

export default new ProviderController();
