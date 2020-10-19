import express from 'express';
import cors from 'cors';
import http from 'http';
import routes from './routes';

import './database';
// import './observers/subjects/database/index';

import SocketIO from './lib/socket';
import Queue from './lib/queue';

class App {
  constructor() {
    this.app = express();
    this.server = http.Server(this.app);

    this.initNotificationSocket();

    this.middlewares();
    this.routes();
  }

  middlewares() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  routes() {
    this.app.use(routes);
  }

  initNotificationSocket() {
    SocketIO.start(this.server);
    Queue.processQueue();
  }
}

export default new App().server;
