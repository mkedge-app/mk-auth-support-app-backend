import Sequelize, { Model } from 'sequelize';

class QRPix extends Model {
  static init(sequelize) {
    super.init(
      {
        titulo: {
          type: Sequelize.STRING,
          primaryKey: true,
        },
        qrcode: Sequelize.TEXT,
      },
      {
        sequelize,
        tableName: 'sis_qrpix',
        timestamps: false,
      }
    );

    return this;
  }
}

export default QRPix;
