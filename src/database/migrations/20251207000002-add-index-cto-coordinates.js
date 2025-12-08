module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('mp_caixa', ['latitude', 'longitude'], {
      name: 'idx_cto_lat_lng',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('mp_caixa', 'idx_cto_lat_lng');
  },
};
