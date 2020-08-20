import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import routes from './routes';

import './database';

import DatabaseSubject from './observers/subjects/database/index';

class App {
  constructor() {
    this.server = express();

    this.middlewares();
    this.routes();
    this.mongo();
  }

  middlewares() {
    this.server.use(cors());
    this.server.use(express.json());
  }

  routes() {
    this.server.use(routes);
  }

  mongo() {
    this.mongoConnection = mongoose.connect(
      'mongodb+srv://rest-api-mk-edge:mk-edge-2020@cluster0.dmaf2.mongodb.net/mk-edge?retryWrites=true&w=majority',
      {
        useNewUrlParser: true,
        useFindAndModify: true,
        useUnifiedTopology: true,
      }
    );
  }

  initDataBaseObserver() {
    DatabaseSubject();
  }
}

export default new App().server;
