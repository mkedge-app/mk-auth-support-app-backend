import { isValidObjectId } from 'mongoose';
import { resolveDbConnection } from '../middlewares/connectionResolver';
import Tenant from '../schemas/Tenant';

class ProviderController {
  async index(req, res) {
    const tenants = await Tenant.find();

    for (const [index, tenant] of tenants.entries()) {
      const dbStatus = await resolveDbConnection(tenant);

      tenants[index] = {
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
          ativa: tenant.assinatura.ativa,
          valor: tenant.assinatura.valor,
          data_vencimento: tenant.assinatura.data_vencimento,
          dia_vencimento: tenant.assinatura.dia_vencimento
        }
      }
    }

    return res.json(tenants);
  }

  async create(req, res) {
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
  }

  async update(req, res) {
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
    tenant.responsavel = req.body?.responsavel ? req.body.responsavel : tenant.responsavel;
    tenant.contato = req.body?.contato ? req.body.contato : tenant.contato;

    tenant.provedor.nome = req.body?.provedor?.nome ? req.body.provedor.nome : tenant.provedor.nome;

    tenant.database.name = req.body?.database?.name ? req.body.database.name : tenant.database.name;
    tenant.database.dialect = req.body?.database?.dialect ? req.body.database.dialect : tenant.database.dialect;
    tenant.database.host = req.body?.database?.host ? req.body.database.host : tenant.database.host;
    tenant.database.username = req.body?.database?.username ? req.body.database.username : tenant.database.username;

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
  }

  async show(req, res) {
    const { tenant_id } = req.params;

    const isValidTenantId = isValidObjectId(tenant_id);

    if (!isValidTenantId) {
      return res.status(400).json({
        error: 'Id inválido',
        message: 'O id informado não é válido'
      });
    }

    const tenant = await Tenant.findById(tenant_id);

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
        conectado: dbStatus,
        name: tenant.database.name,
        dialect: tenant.database.dialect,
        host: tenant.database.host,
        username: tenant.database.username,
        password: tenant.database.password,
      },
      assinatura: {
        ativa: false,
        valor: tenant.assinatura.valor,
        data_vencimento: tenant.assinatura.data_vencimento,
        dia_vencimento: tenant.assinatura.dia_vencimento
      }
    });
  }
}

export default new ProviderController();
