import Sequelize, { Model } from 'sequelize';

class CTO extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
        },
        nome: Sequelize.STRING,
        latitude: Sequelize.STRING,
        longitude: Sequelize.STRING,
      },
      {
        sequelize,
        tableName: 'mp_caixa',
      }
    );

    return this;
  }
}

export default CTO;
