import Sequelize, { Model } from 'sequelize';

class Permissions extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
        },
        nome: Sequelize.STRING,
        usuario: Sequelize.STRING,
        permissao: Sequelize.STRING,
      },
      {
        sequelize,
        tableName: 'sis_perm',
      }
    );

    return this;
  }
}

export default Permissions;
