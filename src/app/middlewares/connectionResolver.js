/* eslint-disable array-callback-return */
/* eslint-disable no-underscore-dangle */
import Sequelize from 'sequelize';

import Tenant from '../schemas/Tenant';

import CTO from '../models/CTO';
import User from '../models/User';
import Client from '../models/Client';
import Radacct from '../models/Radacct';
import Invoice from '../models/Invoice';
import Employee from '../models/Employee';
import Mensagem from '../models/Mensagem';
import SystemLog from '../models/SystemLog';
import Permissions from '../models/Permissions';
import Notification from '../models/Notification';
import ConnectedUsers from '../models/ConnectedUsers';
import SupportRequest from '../models/SupportRequest';
import InstallationRequest from '../models/InstallationRequest';

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
  Notification,
  InstallationRequest,
  ConnectedUsers,
  Permissions,
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
    
    try {
      await connection.authenticate();
      tenantDatabaseConnections[id] = connection;
      resolve();
    } catch (error) {
      reject('Database params are invalid');
    }
  })
}

loadTenantConnections();

async function ConnectionResolver(req, res, next) {
  const { tenant_id } = req.query;

  if (!tenant_id) {
    return res.status(401).json({ message: 'No key provided' });
  }

  const tenant = await Tenant.findOne({ _id: tenant_id });

  if (!tenant) {
    return res.status(401).json({ message: 'Invalid key' });
  }

  if (!tenant.assinatura.ativa) {
    return res.status(401).json({ message: 'Subscription is not active' });
  }

  const sequelizeConnection = tenantDatabaseConnections[tenant_id];

  if (!sequelizeConnection) {
    return res
      .status(401)
      .json({ message: 'Tenant database is not connected' });
  }

  if (sequelizeConnection) {
    models.map(model => model.init(sequelizeConnection));
    next();
  }
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

export { ConnectionResolver, connectNewTenantsDB, tenantDatabaseConnections, resolveDbConnection };
