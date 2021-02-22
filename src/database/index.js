import mongoose from 'mongoose';
import databaseConfig from '../config/database';
import logger from '../logger';

class Database {
  constructor() {
    this.mongo();
  }

  async mongo() {
    // Conexao com o mongo
    try {
      this.mongoConnection = await mongoose.connect(
        databaseConfig.mongodb_url,
        {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        }
      );

      logger.info(`Successfull connection: ${databaseConfig.mongodb_url}`);
    } catch (error) {
      logger.error(`Connection Error: ${error}`);
    }
  }
}

export default new Database();
