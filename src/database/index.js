import mongoose from 'mongoose';

class Database {
  constructor() {
    this.mongo();
  }

  mongo() {
    // Conexão com o mongo modo Desenvolvimento
    // this.mongoConnection = mongoose.connect(
    //   'mongodb://192.168.99.100:27017/mkedgetenants',
    //   { useNewUrlParser: true, useUnifiedTopology: true }
    // );

    // Conexão com mongo modo Produção
    this.mongoConnection = mongoose.connect(
      'mongodb://localhost:27017/mkedgetenants',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        authSource: 'admin',
        auth: {
          user: 'root',
          password: 'Falcon2931',
        },
      }
    );
  }
}

export default new Database();
