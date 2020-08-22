/* eslint-disable no-console */
import MySQLEvents from '@rodrigogs/mysql-events';
import mysql from 'mysql';
import io from 'socket.io';
import { format } from 'date-fns';

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
      name: 'ON_EMPLOYEE_CHANGE',
      expression: 'mkradius.sis_suporte.tecnico',
      statement: MySQLEvents.STATEMENTS.ALL,
      onEvent: event => {
        const { tecnico: new_employee_id } = event.affectedRows[0].after;

        const header = 'Novo chamado';
        const message = 'Um novo chamado foi assinalado para você';

        DatabaseObserver.notifyEmployee(
          new_employee_id,
          this.connectedUsers,
          this.io,
          header,
          message
        );
      },
    });

    instance.addTrigger({
      name: 'ON_VISIT_DATE_CHANGE',
      expression: 'mkradius.sis_suporte.visita',
      statement: MySQLEvents.STATEMENTS.ALL,
      onEvent: event => {
        const { tecnico: new_employee_id } = event.affectedRows[0].after;

        const { visita } = event.affectedRows[0].after;
        const new_visit_time = format(visita, 'dd/MM/yyyy');

        const header = 'Data de visita alterada';
        const message = `Visita à Fulano de Tal foi alterada para ${new_visit_time}`;

        DatabaseObserver.notifyEmployee(
          new_employee_id,
          this.connectedUsers,
          this.io,
          header,
          message
        );
      },
    });

    instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, console.error);
    instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, console.error);
  }
}

export default new DatabaseSubject();
