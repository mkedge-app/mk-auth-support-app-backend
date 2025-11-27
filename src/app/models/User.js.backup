import Sequelize, { Model } from 'sequelize';
import sha256 from 'js-sha256';

class User extends Model {
  static init(sequelize) {
    super.init(
      {
        idacesso: {
          type: Sequelize.STRING,
          primaryKey: true,
        },
        login: Sequelize.STRING,
        email: Sequelize.STRING,
        nome: Sequelize.STRING,
        ativo: Sequelize.BOOLEAN,
        sha: Sequelize.STRING,
        cli_grupos: Sequelize.STRING,
      },
      {
        sequelize,
        tableName: 'sis_acesso',
      }
    );

    return this;
  }

  checkPassword(password) {
    const incoming_hash = sha256(password);
    return incoming_hash === this.sha;
  }
}

export default User;
