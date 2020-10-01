import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  format,
  endOfYear,
  addHours,
} from 'date-fns';

import { Op } from 'sequelize';

import Client from '../models/Client';
import Radacct from '../models/Radacct';

class UserConnectionsController {
  async show(req, res) {
    const { id: client_id } = req.params;

    const client = await Client.findByPk(client_id);

    if (!client) {
      return res.status(400).json({ message: 'No client found' });
    }

    const client_connections = await Radacct.findAll({
      where: {
        username: client.login,
        acctstarttime: {
          [Op.lte]: endOfYear(new Date()),
        },
      },
      limit: 10,
      order: [['acctstarttime', 'DESC']],
    });

    if (!client_connections) {
      return res.status(400).json({ message: 'No connection data available' });
    }

    const response_obj = [];

    const timeZoneOffset = new Date().getTimezoneOffset() / 60;

    client_connections.forEach(connection => {
      const start_time = format(
        addHours(connection.acctstarttime, timeZoneOffset),
        'HH:mm'
      );
      const start_date = format(
        addHours(connection.acctstarttime, timeZoneOffset),
        'dd/MM/yyyy'
      );

      const end_time =
        connection.acctstoptime !== null
          ? format(addHours(connection.acctstoptime, timeZoneOffset), 'HH:mm')
          : null;

      const end_date =
        connection.acctstoptime !== null
          ? format(
              addHours(connection.acctstoptime, timeZoneOffset),
              'dd/MM/yyyy'
            )
          : null;

      const now_time = new Date(
        new Date().valueOf() - new Date().getTimezoneOffset() * 60000
      );

      let duration = 0;

      duration = `${differenceInDays(
        connection.acctstoptime === null ? now_time : connection.acctstoptime,
        connection.acctstarttime
      )}d`;

      if (duration === '0d') {
        duration = `${differenceInHours(
          connection.acctstoptime === null ? now_time : connection.acctstoptime,
          connection.acctstarttime
        )}h`;
      }

      if (duration === '0h') {
        duration = `${differenceInMinutes(
          connection.acctstoptime === null ? now_time : connection.acctstoptime,
          connection.acctstarttime
        )}m`;
      }

      function calcOctets(value, count) {
        const new_value = value / 1024;
        count += 1;

        if (new_value < 1000) {
          let unit = null;

          if (count === 1) {
            unit = 'Kb';
          } else if (count === 2) {
            unit = 'Mb';
          } else {
            unit = 'Gb';
          }

          return {
            new_value,
            unit,
          };
        }

        return calcOctets(new_value, count);
      }

      const upload = calcOctets(connection.acctinputoctets, 0);

      const download = calcOctets(connection.acctoutputoctets, 0);

      response_obj.push({
        start_date,
        start_time,

        end_date,
        end_time,

        duration,

        upload,
        download,
      });
    });

    return res.json(response_obj);
  }
}

export default new UserConnectionsController();
