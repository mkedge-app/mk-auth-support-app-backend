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
];

const tenantDatabaseConnections = {};

async function loadTenantConnections() {
  const providers = await Tenant.find({});

  providers.map(tenant => {
    const { _id: id, dialect, host, username, password, database } = tenant;

    const connection = new Sequelize({
      dialect,
      host,
      username,
      password,
      database,
      define: {
        timestamps: false,
        underscored: true,
        underscoredAll: true,
      },
    });

    tenantDatabaseConnections[id] = connection;
  });
}

async function connectNewTenantsDB(tenant) {
  const { _id: id, dialect, host, username, password, database } = tenant;

  const connection = new Sequelize({
    dialect,
    host,
    username,
    password,
    database,
    define: {
      timestamps: false,
      underscored: true,
      underscoredAll: true,
    },
  });

  tenantDatabaseConnections[id] = connection;
}

loadTenantConnections();

async function ConnectionResolver(req, res, next) {
  const { tenant_id } = req.query;

  const sequelizeConnection = tenantDatabaseConnections[tenant_id];

  if (sequelizeConnection) {
    models.map(model => model.init(sequelizeConnection));
    next();
  }
}

export { ConnectionResolver, connectNewTenantsDB };
