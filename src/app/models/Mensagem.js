import Sequelize, { Model } from 'sequelize';

class Mensagem extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        chamado: Sequelize.STRING,
        msg: Sequelize.TEXT,
        atendente: Sequelize.STRING,
        msg_data: {
          type: Sequelize.DATE,
          field: 'msg_data',
        },
        login: Sequelize.STRING,
        tipo: Sequelize.STRING,
      },
      {
        sequelize,
        tableName: 'sis_msg',
        timestamps: false,
      }
    );

    return this;
  }
}

export default Mensagem;
