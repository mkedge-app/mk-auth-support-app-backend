import Sequelize, { Model } from 'sequelize';

class Client extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
        },
        endereco: Sequelize.STRING,
        numero: Sequelize.STRING,
        bairro: Sequelize.STRING,
        coordenadas: Sequelize.STRING,
      },
      {
        sequelize,
        tableName: 'sis_cliente',
      }
    );

    return this;
  }
}

export default Client;
