module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Adicionar campos financeiros na tabela sis_lanc
    await queryInterface.addColumn('sis_lanc', 'formapag', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'dinheiro',
    });

    await queryInterface.addColumn('sis_lanc', 'acrescimo', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    });

    await queryInterface.addColumn('sis_lanc', 'multa_mora', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    });

    await queryInterface.addColumn('sis_lanc', 'desconto', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    });

    await queryInterface.addColumn('sis_lanc', 'valor_pago', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    // Campos para pagamento com cartão
    await queryInterface.addColumn('sis_lanc', 'cartao_bandeira', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    await queryInterface.addColumn('sis_lanc', 'cartao_numero', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });

    // Campos para pagamento com cheque
    await queryInterface.addColumn('sis_lanc', 'cheque_banco', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn('sis_lanc', 'cheque_numero', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn('sis_lanc', 'cheque_agcc', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('sis_lanc', 'formapag');
    await queryInterface.removeColumn('sis_lanc', 'acrescimo');
    await queryInterface.removeColumn('sis_lanc', 'multa_mora');
    await queryInterface.removeColumn('sis_lanc', 'desconto');
    await queryInterface.removeColumn('sis_lanc', 'valor_pago');
    await queryInterface.removeColumn('sis_lanc', 'cartao_bandeira');
    await queryInterface.removeColumn('sis_lanc', 'cartao_numero');
    await queryInterface.removeColumn('sis_lanc', 'cheque_banco');
    await queryInterface.removeColumn('sis_lanc', 'cheque_numero');
    await queryInterface.removeColumn('sis_lanc', 'cheque_agcc');
  },
};
