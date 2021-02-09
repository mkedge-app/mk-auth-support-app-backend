import mongoose from 'mongoose';
import databaseConfig from '../config/database';
import logger from '../logger';

class Database {
  constructor() {
    this.mongo();
  }

  mongo() {
    // Conexao com o mongo modo Desenvolvimento
    try {
      this.mongoConnection = mongoose.connect(databaseConfig.mongodb_url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      logger.info(`Successfull connection: ${databaseConfig.mongodb_url}`);
    } catch (error) {
      logger.error(`Connection Error: ${error}`);
    }

    // Conexao com mongo modo Producao
    // try {
    //   this.mongoConnection = mongoose.connect(databaseConfig.mongodb_url, {
    //     useNewUrlParser: true,
    //     useUnifiedTopology: true,
    //     authSource: databaseConfig.mongodb_auth_source,
    //     auth: {
    //       user: databaseConfig.mongodb_user,
    //       password: databaseConfig.mongodb_password,
    //     },
    //   });
    //   logger.info(`Successfull connection: ${databaseConfig.mongodb_url}`);
    // } catch (error) {
    //   logger.error(`Connection Error: ${error}`);
    // }
  }
}

export default new Database();
