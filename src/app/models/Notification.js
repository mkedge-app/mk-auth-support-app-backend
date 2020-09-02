import Sequelize, { Model } from 'sequelize';

class Notification extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
        },
        header: Sequelize.STRING,
        content: Sequelize.STRING,
        user: Sequelize.INTEGER,
        request_data: Sequelize.TEXT,
        is_read: Sequelize.BOOLEAN,
        is_viewed: Sequelize.BOOLEAN,
        viewed_at: Sequelize.DATE,
        created_at: Sequelize.DATE,
      },
      {
        sequelize,
        tableName: 'edge_notifications',
      }
    );

    return this;
  }
}

export default Notification;
