import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import http from 'http';
import routes from './routes';

import './database';
import './observers/subjects/database/index';

import SocketIO from './lib/socket';
import Queue from './lib/queue';

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
    SocketIO.start(this.server);
    Queue.processQueue();
  }
}

export default new App().server;
