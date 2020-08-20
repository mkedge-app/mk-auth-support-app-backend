import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import http from 'http';
import routes from './routes';

import './database';

import DatabaseSubject from './observers/subjects/database/index';

class App {
  constructor() {
    this.app = express();
    this.server = http.Server(this.app);

    this.initNotificationSocket();

    this.middlewares();
    this.routes();
    this.mongo();
  }

  middlewares() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  routes() {
    this.app.use(routes);
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

  initNotificationSocket() {
    DatabaseSubject.socket(this.server);
  }
}

export default new App().server;
