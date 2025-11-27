import Sequelize, { Model } from 'sequelize';

class Invoice extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
        },
        uuid_lanc: Sequelize.STRING,
        datavenc: Sequelize.DATE,
        datapag: Sequelize.DATE,
        datadel: Sequelize.DATE,
        valor: Sequelize.STRING,
        status: Sequelize.STRING,
        login: Sequelize.STRING,
        tipo: Sequelize.STRING,
        obs: Sequelize.STRING,
        linhadig: Sequelize.STRING,
      },
      {
        sequelize,
        tableName: 'sis_lanc',
        timestamps: false,
      }
    );

    return this;
  }
}

export default Invoice;
