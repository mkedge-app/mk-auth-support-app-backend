/* eslint-disable no-underscore-dangle */
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
        const { tecnico: previous_employee_id } = event.affectedRows[0].before;

        const { tecnico: new_employee_id } = event.affectedRows[0].after;
        const { id, login } = event.affectedRows[0].after;

        const client = await Client.findOne({
          where: {
            login,
          },
          attributes: ['nome', 'tipo', 'ip', 'plano'],
        });

        const request_data = {
          id,
          nome: client.nome,
          tipo: client.tipo,
          ip: client.ip,
          plano: client.plano,
        };

        // Notificação para o novo técnico
        const header = client.nome;
        const message = `Você recebeu um novo chamado`;

        DatabaseObserver.notifyEmployee(
          new_employee_id,
          header,
          message,
          request_data
        );

        // Notificação para o antigo técnico
        if (previous_employee_id) {
          const header_ = client.nome;
          const [client_first_name] = client.nome.split(' ');
          const message_ = `Você não é mais responsável pelo chamado de ${client_first_name}`;

          DatabaseObserver.notifyEmployee(
            previous_employee_id,
            header_,
            message_,
            request_data
          );
        }
      },
    });

    instance.addTrigger({
      name: 'ON_VISIT_DATE_CHANGE',
      expression: 'mkradius.sis_suporte.visita',
      statement: MySQLEvents.STATEMENTS.ALL,
      onEvent: event => {
        const { tecnico: employee_id } = event.affectedRows[0].after;

        const { visita } = event.affectedRows[0].after;
        const new_visit_time = format(visita, 'dd/MM/yyyy');

        const header = 'Data de visita alterada';
        const message = `Visita à Fulano de Tal foi alterada para ${new_visit_time}`;

        DatabaseObserver.notifyEmployee(employee_id, header, message);
      },
    });

    instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, console.error);
    instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, console.error);
  }
}

export default new DatabaseSubject();
