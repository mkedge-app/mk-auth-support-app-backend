import Sequelize, { Model } from 'sequelize';

class SisProvedor extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
        },
        nome: Sequelize.STRING,
        google_maps_api_key: Sequelize.STRING,
      },
      {
        sequelize,
        tableName: 'sis_provedor',
        timestamps: false,
      }
    );

    return this;
  }
}

export default SisProvedor;
