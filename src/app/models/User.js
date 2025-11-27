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
      }
    );

    return this;
  }

  checkPassword(password) {
    console.log('===== DEBUG checkPassword =====');
    console.log('Senha recebida:', password);
    console.log('Hash no banco:', this.sha);
    
    // Primeiro aplica SHA-256 na senha (padrão do sistema)
    const sha256Hash = sha256(password);
    console.log('SHA-256 da senha:', sha256Hash);
    
    // Verifica se é um hash SHA-256 puro (backward compatibility)
    if (sha256Hash === this.sha) {
      console.log('✅ Match com SHA-256 puro');
      return true;
    }
    
    // Verifica se é hash bcrypt (SHA-256 → bcrypt)
    // Converte $2y$ (PHP) para $2a$ (Node.js) para compatibilidade
    try {
      let hashToCompare = this.sha;
      
      // Converte o prefixo $2y$ para $2a$ se necessário
      if (hashToCompare && hashToCompare.startsWith('$2y$')) {
        hashToCompare = hashToCompare.replace(/^\$2y\$/, '$2a$');
        console.log('Hash convertido ($2y$ -> $2a$):', hashToCompare);
      }
      
      // Compara SHA-256 da senha com o hash bcrypt
      const result = bcrypt.compareSync(sha256Hash, hashToCompare);
      console.log('Resultado bcrypt.compareSync:', result);
      console.log('===============================');
      return result;
    } catch (error) {
      console.error('❌ Erro na verificação de senha:', error);
      console.log('===============================');
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
