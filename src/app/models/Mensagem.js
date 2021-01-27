import Sequelize, { Model } from 'sequelize';

class Mensagem extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
        },
        chamado: Sequelize.STRING,
        msg: Sequelize.STRING,
        atendente: Sequelize.STRING,
        msg_data: Sequelize.STRING,
        login: Sequelize.STRING,
        tipo: Sequelize.STRING,
      },
      {
        sequelize,
        tableName: 'sis_msg',
      }
    );

    return this;
  }
}

export default Mensagem;
