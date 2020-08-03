import { Op } from 'sequelize';
import { subMonths, format, getDate, getDaysInMonth, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

    const forth_to_last_month = format(
      subMonths(new Date(), 3),
      'yyyy-MM-01 00:00:00'
    );

    const forth_to_last_month_connections = await Radacct.findAll({
      where: {
        username: client.login,
        acctstarttime: {
          [Op.between]: [forth_to_last_month, third_to_last_month],
        },
      },
    });

    let forthToLastDataUsage = 0;
    // eslint-disable-next-line array-callback-return
    forth_to_last_month_connections.map(item => {
      forthToLastDataUsage =
        forthToLastDataUsage + item.acctinputoctets + item.acctoutputoctets;
    });

    const fifith_to_last_month = format(
      subMonths(new Date(), 4),
      'yyyy-MM-01 00:00:00'
    );

    const fifith_to_last_month_connections = await Radacct.findAll({
      where: {
        username: client.login,
        acctstarttime: {
          [Op.between]: [fifith_to_last_month, forth_to_last_month],
        },
      },
    });

    let fifithToLastDataUsage = 0;
    // eslint-disable-next-line array-callback-return
    fifith_to_last_month_connections.map(item => {
      fifithToLastDataUsage =
        fifithToLastDataUsage + item.acctinputoctets + item.acctoutputoctets;
    });

    const sixth_to_last_month = format(
      subMonths(new Date(), 5),
      'yyyy-MM-01 00:00:00'
    );

    const sixth_to_last_month_connections = await Radacct.findAll({
      where: {
        username: client.login,
        acctstarttime: {
          [Op.between]: [sixth_to_last_month, fifith_to_last_month],
        },
      },
    });

    let sixthToLastDataUsage = 0;
    // eslint-disable-next-line array-callback-return
    sixth_to_last_month_connections.map(item => {
      sixthToLastDataUsage =
        sixthToLastDataUsage + item.acctinputoctets + item.acctoutputoctets;
    });

    const current_user_connection = await Radacct.findAll({
      where: {
        username: client.login,
      },
      limit: 1,
      order: [['acctstarttime', 'DESC']],
      attributes: ['acctstarttime', 'acctstoptime'],
    });

    let parsedDate = null;
    let parsedTime = null;

    if (current_user_connection.length !== 0) {
      const parsedAcctStartTime = addHours(
        current_user_connection[0].acctstarttime,
        4
      );

      parsedDate = format(parsedAcctStartTime, 'dd/MM/yyyy');

      parsedTime = format(parsedAcctStartTime, 'HH:mm');
    }

    const days_in_current_month = getDate(new Date());

    const consuption_average = (
      dataUsage /
      1024 /
      1024 /
      1024 /
      days_in_current_month
    ).toFixed(2);

    const graph_obj = {
      labels: [
        format(subMonths(new Date(), 5), 'MMM', { locale: ptBR })
          .charAt(0)
          .toUpperCase() +
          format(subMonths(new Date(), 5), 'MMM', { locale: ptBR }).slice(1),
        format(subMonths(new Date(), 4), 'MMM', { locale: ptBR })
          .charAt(0)
          .toUpperCase() +
          format(subMonths(new Date(), 4), 'MMM', { locale: ptBR }).slice(1),
        format(subMonths(new Date(), 3), 'MMM', { locale: ptBR })
          .charAt(0)
          .toUpperCase() +
          format(subMonths(new Date(), 3), 'MMM', { locale: ptBR }).slice(1),
        format(subMonths(new Date(), 2), 'MMM', { locale: ptBR })
          .charAt(0)
          .toUpperCase() +
          format(subMonths(new Date(), 2), 'MMM', { locale: ptBR }).slice(1),
        format(subMonths(new Date(), 1), 'MMM', { locale: ptBR })
          .charAt(0)
          .toUpperCase() +
          format(subMonths(new Date(), 1), 'MMM', { locale: ptBR }).slice(1),
      ],
      datasets: [
        {
          data: [
            (sixthToLastDataUsage / 1024 / 1024 / 1024).toFixed(2),
            (fifithToLastDataUsage / 1024 / 1024 / 1024).toFixed(2),
            (forthToLastDataUsage / 1024 / 1024 / 1024).toFixed(2),
            (thirdToLastDataUsage / 1024 / 1024 / 1024).toFixed(2),
            (secondToLastDataUsage / 1024 / 1024 / 1024).toFixed(2),
          ],
        },
      ],
    };

    let finance_state = null;

    if (client.bloqueado === 'sim') {
      finance_state = 'Bloqueado';
    } else if (client.observacao === 'sim') {
      finance_state = 'Em observação';
    } else {
      finance_state = 'Liberado';
    }

    let equipment_status = 'Offline';
    if (current_user_connection.length !== 0) {
      equipment_status =
        current_user_connection[0].acctstoptime === null ? 'Online' : 'Offline';
    }

    const response = {
      ...client.dataValues,
      finance_state,
      current_data_usage: (dataUsage / 1024 / 1024 / 1024).toFixed(2),
      consuption_average,
      expected_consuption: (
        consuption_average * getDaysInMonth(new Date())
      ).toFixed(2),
      second_to_last_data_usage: secondToLastDataUsage / 1024 / 1024 / 1024,
      third_to_last_data_usage: thirdToLastDataUsage / 1024 / 1024 / 1024,
      current_user_connection:
        parsedDate !== null
          ? `${parsedDate} às ${parsedTime}`
          : 'Não há conexões',
      equipment_status,
      graph_obj,
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
