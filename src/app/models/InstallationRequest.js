import Sequelize, { Model } from 'sequelize';

class InstallationRequest extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
        },
        login: Sequelize.STRING,
        nome: Sequelize.STRING,
        tipo: Sequelize.STRING,
        tecnico: Sequelize.STRING,
        status: Sequelize.STRING,
        visita: Sequelize.DATE,
        visitado: Sequelize.STRING,
        endereco_res: Sequelize.STRING,
        numero_res: Sequelize.STRING,
        bairro_res: Sequelize.STRING,
        ip: Sequelize.STRING,
        plano: Sequelize.STRING,
        equipamento: Sequelize.STRING,
        obs: Sequelize.STRING,
        senha: Sequelize.STRING,
        coordenadas: Sequelize.STRING,
        datainst: Sequelize.STRING,
        instalado: Sequelize.STRING,
        disp: Sequelize.STRING,
      },
      {
        sequelize,
        tableName: 'sis_solic',
      }
    );

    return this;
  }
}

export default InstallationRequest;
