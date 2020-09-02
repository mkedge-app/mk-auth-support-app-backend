module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('edge_notifications', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      header: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      content: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      user: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      request_data: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_viewed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      viewed_at: {
        type: Sequelize.DATE,
        defaultValue: null,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('edge_notifications');
  },
};
