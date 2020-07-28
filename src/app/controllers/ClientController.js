import { Op } from 'sequelize';
import { subMonths, format } from 'date-fns';

import Client from '../models/Client';
import Radacct from '../models/Radacct';

class ClientController {
  async show(req, res) {
    const { id: client_id } = req.params;

    const client = await Client.findByPk(client_id);

    if (!client) {
      return res.status(400).json({ message: 'No client not found' });
    }

    const current_month = format(new Date(), 'yyyy-MM-01 00:00:00');

    const client_connections = await Radacct.findAll({
      where: {
        username: client.login,
        acctstarttime: {
          [Op.gt]: current_month,
        },
      },
    });

    if (!client_connections) {
      return res.status(400).json({ message: 'No connection data available' });
    }

    let dataUsage = 0;
    // eslint-disable-next-line array-callback-return
    client_connections.map(item => {
      dataUsage = dataUsage + item.acctinputoctets + item.acctoutputoctets;
    });

    const second_to_last_month = format(
      subMonths(new Date(), 1),
      'yyyy-MM-01 00:00:00'
    );

    const second_to_last_month_connections = await Radacct.findAll({
      where: {
        username: client.login,
        acctstarttime: {
          [Op.between]: [second_to_last_month, current_month],
        },
      },
    });

    let secondToLastDataUsage = 0;
    // eslint-disable-next-line array-callback-return
    second_to_last_month_connections.map(item => {
      secondToLastDataUsage =
        secondToLastDataUsage + item.acctinputoctets + item.acctoutputoctets;
    });

    const third_to_last_month = format(
      subMonths(new Date(), 2),
      'yyyy-MM-01 00:00:00'
    );

    const third_to_last_month_connections = await Radacct.findAll({
      where: {
        username: client.login,
        acctstarttime: {
          [Op.between]: [third_to_last_month, second_to_last_month],
        },
      },
    });

    let thirdToLastDataUsage = 0;
    // eslint-disable-next-line array-callback-return
    third_to_last_month_connections.map(item => {
      thirdToLastDataUsage =
        thirdToLastDataUsage + item.acctinputoctets + item.acctoutputoctets;
    });

    const current_user_connection = await Radacct.findAll({
      where: {
        username: client.login,
      },
      limit: 1,
      order: [['acctstarttime', 'DESC']],
      attributes: ['acctstarttime', 'acctstoptime'],
    });

    const parsedDate = format(
      current_user_connection[0].acctstarttime,
      'dd/MM/yyyy'
    );

    const parsedTime = format(
      current_user_connection[0].acctstarttime,
      'HH:mm'
    );

    const response = {
      ...client.dataValues,
      current_data_usage: dataUsage / 1024 / 1024 / 1024,
      second_to_last_data_usage: secondToLastDataUsage / 1024 / 1024 / 1024,
      third_to_last_data_usage: thirdToLastDataUsage / 1024 / 1024 / 1024,
      current_user_connection: `${parsedDate} às ${parsedTime}`,
      equipment_status:
        current_user_connection[0].acctstoptime === null ? 'Online' : 'Offline',
    };

    return res.json(response);
  }

  async update(req, res) {
    const { id: client_id } = req.params;

    const { latitude, longitude, new_cto } = req.body;

    const client = await Client.findByPk(client_id);

    if (!client) {
      return res.status(400).json({ message: 'No client not found' });
    }

    if (new_cto) {
      client.caixa_herm = new_cto;
    }

    if (latitude && longitude) {
      client.coordenadas = `${latitude},${longitude}`;
    }

    await client.save();

    return res.sendStatus(200);
  }
}

export default new ClientController();
