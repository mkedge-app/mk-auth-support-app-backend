/* eslint-disable array-callback-return */
/* eslint-disable no-underscore-dangle */
import Sequelize from 'sequelize';

import Tenant from '../schemas/Tenant';

import CTO from '../models/CTO';
import User from '../models/User';
import Client from '../models/Client';
import Radacct from '../models/Radacct';
import Invoice from '../models/Invoice';
import QRPix from '../models/QRPix';
import Employee from '../models/Employee';
import Mensagem from '../models/Mensagem';
import SystemLog from '../models/SystemLog';
import Permissions from '../models/Permissions';
import Notification from '../models/Notification';
import ConnectedUsers from '../models/ConnectedUsers';
import SupportRequest from '../models/SupportRequest';
import InstallationRequest from '../models/InstallationRequest';
import SisProvedor from '../models/SisProvedor';
import SisOpcao from '../models/SisOpcao';

const models = [
  User,
  SupportRequest,
  Employee,
  Client,
  Mensagem,
  SystemLog,
  CTO,
  Radacct,
  Invoice,
  QRPix,
  Notification,
  InstallationRequest,
  ConnectedUsers,
  Permissions,
  SisProvedor,
  SisOpcao,
];

const tenantDatabaseConnections = {};

async function loadTenantConnections() {
  const providers = await Tenant.find({
    assinatura: { ativa: true }
  });

  providers.map(async tenant => {
    try {
      await connectNewTenantsDB(tenant);
      console.log('Successfuly connected to', tenant.nome, "database");
    } catch (error) {
      console.log(tenant.nome, error);
    }
  });
}

function connectNewTenantsDB(tenant) {
  return new Promise(async (resolve, reject) => {
    const { id } = tenant;

    if (!tenant.assinatura.ativa) {
      reject('Tenant is not active');
    }

    try {
      const connection = new Sequelize({
        dialect: tenant.database.dialect,
        host: tenant.database.host,
        username: tenant.database.username,
        password: tenant.database.password,
        database: tenant.database.name,
        define: {
          timestamps: false,
          underscored: true,
          underscoredAll: true,
        },
      });
      
      await connection.authenticate();
      tenantDatabaseConnections[id] = connection;
      resolve();
    } catch (error) {
      console.log('Erro ao conectar tenant DB:', error.message);
      reject('Database params are invalid or mysql2 not installed');
    }
  })
}

// Carregar conexões de tenants ativos na inicialização
loadTenantConnections();

async function ConnectionResolver(req, res, next) {
  let { tenant_id } = req.query;

  // Se não tiver tenant_id, usa o Updata como padrão (para compatibilidade com painel Angular antigo)
  if (!tenant_id) {
    const defaultTenant = await Tenant.findOne({ cnpj: '04038227000187' }); // Updata
    if (defaultTenant) {
      tenant_id = defaultTenant._id.toString();
      req.query.tenant_id = tenant_id;
      console.log(`⚠️ ConnectionResolver: Usando tenant padrão (Updata: ${tenant_id})`);
    } else {
      return res.status(401).json({ message: 'No key provided' });
    }
  }

  const tenant = await Tenant.findOne({ _id: tenant_id });
  if (!tenant) {
    return res.status(401).json({ message: 'Invalid key' });
  }

  if (!tenant.assinatura.ativa) {
    return res.status(401).json({ message: 'Subscription is not active' });
  }

  const sequelizeConnection = tenantDatabaseConnections[tenant_id];

  // Se não tem conexão, tenta criar (para compatibilidade com mysql2 não instalado)
  if (!sequelizeConnection) {
    console.log(`⚠️ ConnectionResolver: Tentando conectar tenant ${tenant.provedor.nome}...`);
    try {
      await connectNewTenantsDB(tenant);
      const newConnection = tenantDatabaseConnections[tenant_id];
      if (newConnection) {
        models.map(model => model.init(newConnection));
        console.log(`✅ ConnectionResolver: Tenant ${tenant.provedor.nome} conectado com sucesso`);
        return next();
      }
    } catch (error) {
      console.log(`❌ ConnectionResolver: Erro ao conectar tenant - ${error.message}`);
    }
    
    // Se ainda não conseguiu conectar, retorna erro
    return res
      .status(401)
      .json({ message: 'Tenant database is not connected' });
  }

  if (sequelizeConnection) {
    models.map(model => model.init(sequelizeConnection));
    next();
  }
}

// Versão opcional do ConnectionResolver (não retorna erro se não tiver tenant_id)
async function OptionalConnectionResolver(req, res, next) {
  const { tenant_id } = req.query;

  // Se não tem tenant_id, apenas continua
  if (!tenant_id) {
    return next();
  }

  // Se tem, aplica a lógica normal
  return ConnectionResolver(req, res, next);
}

async function resolveDbConnection(tenant) {
  return new Promise(async (resolve, reject) => {
    const { id } = tenant;
    const connection = tenantDatabaseConnections[id]

    if (connection) {
      try {
        await connection.authenticate();
        resolve(true);
      } catch (error) {
        resolve(false);
      }
    } else {
      resolve(false);
    }
  });
}

export { ConnectionResolver, OptionalConnectionResolver, connectNewTenantsDB, tenantDatabaseConnections, resolveDbConnection };
