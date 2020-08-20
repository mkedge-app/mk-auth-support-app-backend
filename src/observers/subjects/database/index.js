/* eslint-disable no-console */
import MySQLEvents from '@rodrigogs/mysql-events';
import mysql from 'mysql';
import io from 'socket.io';

import databaseConfig from '../../../config/database';
import DatabaseObserver from '../../DatabaseObserver';

class DatabaseSubject {
  constructor() {
    this.connectedUsers = {};

    // this.socket(http_server);
    this.init();
  }

  init() {
    this.watchDatabase()
      .then(() => console.log('Waiting for database events...'))
      .catch(console.error);
  }

  socket(http_server) {
    this.io = io(http_server);

    this.io.on('connection', socket => {
      const { employee_id } = socket.handshake.query;
      this.connectedUsers[employee_id] = socket.id;

      socket.on('disconnect', () => {
        delete this.connectedUsers[employee_id];
      });

      socket.on('error', err => {
        console.log('Socket.IO Error');
        console.log(err.stack); // this is changed from your code in last comment
      });
    });
  }

  async watchDatabase() {
    const connection = mysql.createConnection({
      host: databaseConfig.host,
      user: databaseConfig.username,
      password: databaseConfig.password,
    });

    const instance = new MySQLEvents(connection, {
      startAtEnd: true,
      excludedSchemas: {
        mysql: true,
      },
    });

    await instance.start();

    instance.addTrigger({
      name: 'ON_ANY_CHANGE',
      expression: 'mkradius.sis_suporte',
      statement: MySQLEvents.STATEMENTS.ALL,
      onEvent: event => {
        const { tecnico: new_employee_id } = event.affectedRows[0].after;

        DatabaseObserver.notifyEmployee(
          new_employee_id,
          this.connectedUsers,
          this.io
        );
      },
    });

    instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, console.error);
    instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, console.error);
  }
}

export default new DatabaseSubject();
