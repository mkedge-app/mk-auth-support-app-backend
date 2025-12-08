module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('sis_provedor', 'google_maps_api_key', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('sis_provedor', 'google_maps_api_key');
  },
};
