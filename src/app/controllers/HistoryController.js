/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import Client from '../models/Client';
import Employee from '../models/Employee';
import SupportRequest from '../models/SupportRequest';
import InstallationRequest from '../models/InstallationRequest';

class HistoryController {
  async show(req, res) {
    const { client_id, sort_mode } = req.query;

    const client = await Client.findByPk(client_id);

    if (!client) {
      return res.status(400).json({ message: 'Client not found' });
    }

    const opened_support_requests = await SupportRequest.findAll({
      where: {
        login: client.login,
        status: 'aberto',
      },
      order: [['visita', sort_mode]],
    });

    const opened_installation_requests = await InstallationRequest.findAll({
      where: {
        status: 'aberto',
        login: client.login,
      },
      order: [['visita', sort_mode]],
    });

    for (const [, request] of opened_support_requests.entries()) {
      if (request.tecnico !== null) {
        const func = await Employee.findByPk(request.tecnico);
        request.tecnico = func ? func.nome : null;
        await request.save();
      }
    }

    const opened_array =
      sort_mode === 'DESC'
        ? [...opened_support_requests, ...opened_installation_requests]
        : [...opened_installation_requests, ...opened_support_requests];

    const closed_support_requests = await SupportRequest.findAll({
      where: {
        login: client.login,
        status: 'fechado',
      },
      order: [['visita', sort_mode]],
    });

    const closed_installation_requests = await InstallationRequest.findAll({
      where: {
        // status: 'conluido',
        login: client.login,
      },
      order: [['visita', sort_mode]],
    });

    for (const [, request] of closed_support_requests.entries()) {
      if (request.tecnico !== null) {
        const func = await Employee.findByPk(request.tecnico);

        request.tecnico = func ? func.nome : null;
        await request.save();
      }
    }

    const closed_array =
      sort_mode === 'DESC'
        ? [...closed_support_requests, ...closed_installation_requests]
        : [...closed_installation_requests, ...closed_support_requests]

    const response = {
      opened_requests: opened_array,
      closed_requests: closed_array,
      client,
    };

    return res.json(response);
  }
}

export default new HistoryController();
