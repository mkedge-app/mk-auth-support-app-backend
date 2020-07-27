import Sequelize, { Model } from 'sequelize';

class Radacct extends Model {
  static init(sequelize) {
    super.init(
      {
        radacctid: {
          type: Sequelize.INTEGER,
          primaryKey: true,
        },
        username: Sequelize.STRING,
        acctstarttime: Sequelize.DATE,
        acctstoptime: Sequelize.DATE,
        acctinputoctets: Sequelize.NUMBER,
        acctoutputoctets: Sequelize.NUMBER,
      },
      {
        sequelize,
        tableName: 'radacct',
      }
    );

    return this;
  }
}

export default Radacct;
