import Sequelize, { Model } from 'sequelize';
import sha256 from 'js-sha256';
import bcrypt from 'bcrypt';

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
        timestamps: false,
      }
    );

    return this;
  }

  checkPassword(password) {
    // Primeiro aplica SHA-256 na senha (padrão do sistema)
    const sha256Hash = sha256(password);
    
    // Verifica se é um hash SHA-256 puro (backward compatibility)
    if (sha256Hash === this.sha) {
      return true;
    }
    
    // Verifica se é hash bcrypt (SHA-256 → bcrypt)
    // Converte $2y$ (PHP) para $2a$ (Node.js) para compatibilidade
    try {
      let hashToCompare = this.sha;
      
      // Converte o prefixo $2y$ para $2a$ se necessário
      if (hashToCompare && hashToCompare.startsWith('$2y$')) {
        hashToCompare = hashToCompare.replace(/^\$2y\$/, '$2a$');
      }
      
      // Compara SHA-256 da senha com o hash bcrypt
      return bcrypt.compareSync(sha256Hash, hashToCompare);
    } catch (error) {
      // Log apenas em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro na verificação de senha:', error);
      }
      return false;
    }
  }

  // Helper method to hash new passwords with bcrypt
  static hashPassword(password) {
    const sha256Hash = sha256(password);
    return bcrypt.hashSync(sha256Hash, 10);
  }
}

export default User;
