import Sequelize from 'sequelize';

import User from '../app/models/User';
import Request from '../app/models/Request';
import Employee from '../app/models/Employee';
import Client from '../app/models/Client';
import Mensagem from '../app/models/Mensagem';
import SystemLog from '../app/models/SystemLog';
import CTO from '../app/models/CTO';
import Radacct from '../app/models/Radacct';

import databaseConfig from '../config/database';

const models = [
  User,
  Request,
  Employee,
  Client,
  Mensagem,
  SystemLog,
  CTO,
  Radacct,
];

class Database {
  constructor() {
    this.init();
  }

  init() {
    this.connection = new Sequelize(databaseConfig);

    models.map(model => model.init(this.connection));
  }
}

export default new Database();
