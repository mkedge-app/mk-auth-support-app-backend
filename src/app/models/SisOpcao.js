import Sequelize, { Model } from 'sequelize';

class SisOpcao extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
        },
        nome: Sequelize.STRING,
        valor: Sequelize.TEXT,
      },
      {
        sequelize,
        tableName: 'sis_opcao',
        timestamps: false,
      }
    );

    return this;
  }
}

export default SisOpcao;
