/* eslint-disable no-console */
import MySQLEvents from '@rodrigogs/mysql-events';
import mysql from 'mysql';
import { format } from 'date-fns';

import databaseConfig from '../../../config/database';
import DatabaseObserver from '../../DatabaseObserver';

import Client from '../../../app/models/Client';

class DatabaseSubject {
  constructor() {
    this.connectedUsers = {};

    this.init();
  }

  init() {
    this.watchDatabase()
      .then(() => console.log('Waiting for database events...'))
      .catch(console.error);
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
      onEvent: async event => {
        const { tecnico: new_employee_id } = event.affectedRows[0].after;
        const { id, login } = event.affectedRows[0].after;

        const client = await Client.findOne({
          where: {
            login,
          },
          attributes: ['nome', 'tipo', 'ip', 'plano'],
        });

        const header = 'Novo chamado';
        const message = 'Um novo chamado foi assinalado para você';
        const request_data = {
          id,
          nome: client.nome,
          tipo: client.tipo,
          ip: client.ip,
          plano: client.plano,
        };

        DatabaseObserver.notifyEmployee(
          new_employee_id,
          header,
          message,
          request_data
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

        DatabaseObserver.notifyEmployee(new_employee_id, header, message);
      },
    });

    instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, console.error);
    instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, console.error);
  }
}

export default new DatabaseSubject();
