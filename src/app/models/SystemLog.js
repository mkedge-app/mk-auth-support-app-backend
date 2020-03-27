import Sequelize, { Model } from 'sequelize';

class SystemLog extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        registro: Sequelize.STRING,
        data: Sequelize.STRING,
        login: Sequelize.STRING,
        tipo: Sequelize.STRING,
        operacao: Sequelize.STRING,
      },
      {
        sequelize,
        tableName: 'sis_logs',
      }
    );

    return this;
  }
}

export default SystemLog;
