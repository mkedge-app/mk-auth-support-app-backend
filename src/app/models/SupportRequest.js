import Sequelize, { Model } from 'sequelize';

class SupportRequest extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
        },
        tecnico: Sequelize.INTEGER,
        nome: Sequelize.STRING,
        login: Sequelize.STRING,
        status: Sequelize.STRING,
        assunto: Sequelize.STRING,
        visita: Sequelize.DATE,
        chamado: Sequelize.STRING,
        fechamento: Sequelize.STRING,
        motivo_fechar: Sequelize.STRING,
        prioridade: Sequelize.STRING,
        atendente: Sequelize.STRING,
        login_atend: Sequelize.STRING,
        abertura: Sequelize.DATE,
        email: Sequelize.STRING,
        // telefone: Sequelize.STRING, // Campo não existe na tabela ainda
        // ramal_cto: Sequelize.STRING, // Campo não existe na tabela ainda
        uuid_suporte: Sequelize.STRING,
        ramal: Sequelize.STRING,
      },
      {
        sequelize,
        tableName: 'sis_suporte',
      }
    );

    return this;
  }
}

export default SupportRequest;
