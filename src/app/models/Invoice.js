import Sequelize, { Model } from 'sequelize';

class Invoice extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
        },
        datavenc: Sequelize.DATE,
        datapag: Sequelize.DATE,
        valor: Sequelize.STRING,
        status: Sequelize.STRING,
        login: Sequelize.STRING,
        tipo: Sequelize.STRING,
        obs: Sequelize.STRING,
      },
      {
        sequelize,
        tableName: 'sis_lanc',
      }
    );

    return this;
  }
}

export default Invoice;
