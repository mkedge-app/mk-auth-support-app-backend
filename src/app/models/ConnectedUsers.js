import Sequelize, { Model } from 'sequelize';

class ConnectedUsers extends Model {
  static init(sequelize) {
    super.init(
      {
        nome: Sequelize.STRING,
        email: Sequelize.STRING,
        login: Sequelize.STRING,
      },
      {
        sequelize,
        tableName: 'vtab_conectados',
      }
    );

    return this;
  }
}

export default ConnectedUsers;
