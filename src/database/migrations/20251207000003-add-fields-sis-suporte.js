module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Adicionar campos faltantes na tabela sis_suporte
    await queryInterface.addColumn('sis_suporte', 'ramal', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn('sis_suporte', 'uuid_suporte', {
      type: Sequelize.STRING(36),
      allowNull: true,
      unique: true,
    });

    await queryInterface.addColumn('sis_suporte', 'abertura', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('sis_suporte', 'ramal');
    await queryInterface.removeColumn('sis_suporte', 'uuid_suporte');
    await queryInterface.removeColumn('sis_suporte', 'abertura');
  },
};
