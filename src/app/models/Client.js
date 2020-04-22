import Sequelize, { Model } from 'sequelize';

class Client extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
        },
        endereco_res: Sequelize.STRING,
        numero_res: Sequelize.STRING,
        bairro_res: Sequelize.STRING,
        coordenadas: Sequelize.STRING,
        login: Sequelize.STRING,
        senha: Sequelize.STRING,
        plano: Sequelize.STRING,
        tipo: Sequelize.STRING,
        ip: Sequelize.STRING,
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
