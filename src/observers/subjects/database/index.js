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
        try {
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

          await DatabaseObserver.notifyEmployee(
            new_employee_id,
            header,
            message,
            request_data
          );

          // Notificação para o antigo técnico
          if (event.affectedRows[0].before) {
            const {
              tecnico: previous_employee_id,
            } = event.affectedRows[0].before;

            const header_ = client.nome;
            const [client_first_name] = client.nome.split(' ');
            const message_ = `Você não é mais responsável pelo chamado de ${client_first_name}`;

            await DatabaseObserver.notifyEmployee(
              previous_employee_id,
              header_,
              message_,
              request_data
            );
          }
        } catch (error) {
          console.log(error);
        }
      },
    });

    instance.addTrigger({
      name: 'ON_VISIT_CHANGE',
      expression: 'mkradius.sis_suporte.visita',
      statement: MySQLEvents.STATEMENTS.ALL,
      onEvent: async event => {
        const { tecnico: employee_id } = event.affectedRows[0].after;
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

        // Separação da data e hora antes da alteração
        const { visita: previous_visita } = event.affectedRows[0].before;
        const previous_visit_date = format(previous_visita, 'dd/MM/yyyy');
        const previous_visit_time = format(previous_visita, 'HH:mm');

        // Separação da data e hora depois da alteração
        const { visita } = event.affectedRows[0].after;
        const new_visit_date = format(visita, 'dd/MM/yyyy');
        const new_visit_time = format(visita, 'HH:mm');

        if (previous_visit_date !== new_visit_date) {
          const header = client.nome;
          const [client_first_name] = client.nome.split(' ');
          const message = `Data de visita do chamado de ${client_first_name} foi alterada para ${new_visit_date}`;

          DatabaseObserver.notifyEmployee(
            employee_id,
            header,
            message,
            request_data
          );
        }

        if (previous_visit_time !== new_visit_time) {
          const header = client.nome;
          const [client_first_name] = client.nome.split(' ');
          const message = `Hora de visita do chamado de ${client_first_name} foi alterada para ${new_visit_time}`;

          DatabaseObserver.notifyEmployee(
            employee_id,
            header,
            message,
            request_data
          );
        }
      },
    });

    instance.addTrigger({
      name: 'ON_CLOSE_REQUEST',
      expression: 'mkradius.sis_suporte.status',
      statement: MySQLEvents.STATEMENTS.ALL,
      onEvent: async event => {
        const { tecnico: employee_id } = event.affectedRows[0].after;
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

        const { status: new_status } = event.affectedRows[0].after;

        if (new_status === 'fechado') {
          const header = client.nome;
          const [client_first_name] = client.nome.split(' ');
          const message = `Chamado de ${client_first_name} acaba de ser fechado`;

          DatabaseObserver.notifyEmployee(
            employee_id,
            header,
            message,
            request_data
          );
        }
      },
    });

    instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, console.error);
    instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, console.error);
  }
}

export default new DatabaseSubject();
