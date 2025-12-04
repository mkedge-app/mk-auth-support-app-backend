/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { format, addHours } from 'date-fns';
import Client from '../models/Client';
import Employee from '../models/Employee';
import Mensagem from '../models/Mensagem';
import SupportRequest from '../models/SupportRequest';
import InstallationRequest from '../models/InstallationRequest';

class HistoryController {
  async show(req, res) {
    try {
      const { client_id, sort_mode } = req.query;

      const client = await Client.findByPk(client_id);

    if (!client) {
      return res.status(400).json({ message: 'Client not found' });
    }

    const timeZoneOffset = new Date().getTimezoneOffset() / 60;
    const orderDirection = sort_mode || 'ASC';

    const opened_support_requests = await SupportRequest.findAll({
      where: {
        login: client.login,
        status: 'aberto',
      },
      order: [['visita', orderDirection]],
    });

    const opened_installation_requests = await InstallationRequest.findAll({
      where: {
        status: 'aberto',
        login: client.login,
      },
      order: [['visita', orderDirection]],
    });

    for (const [, request] of opened_support_requests.entries()) {
      if (request.tecnico !== null) {
        const func = await Employee.findByPk(request.tecnico);
        request.dataValues.tecnico = func ? func.nome : null;
      }

      // Buscar mensagem do chamado
      const msg = await Mensagem.findOne({
        where: {
          chamado: request.chamado,
        },
      });

      // Adicionar campos mensagem, data_visita e visita
      request.dataValues.mensagem = msg ? msg.msg : null;
      request.dataValues.data_visita = request.visita
        ? format(
            new Date(
              request.visita.valueOf() +
                request.visita.getTimezoneOffset() * 60000
            ),
            'dd/MM/yyyy'
          )
        : null;
      request.dataValues.visita = request.visita
        ? format(addHours(request.visita, timeZoneOffset), 'HH:mm')
        : null;
    }

    const opened_array =
      orderDirection === 'DESC'
        ? [...opened_support_requests, ...opened_installation_requests]
        : [...opened_installation_requests, ...opened_support_requests];

    const closed_support_requests = await SupportRequest.findAll({
      where: {
        login: client.login,
        status: 'fechado',
      },
      order: [['visita', orderDirection]],
    });

    const closed_installation_requests = await InstallationRequest.findAll({
      where: {
        // status: 'conluido',
        login: client.login,
      },
      order: [['visita', orderDirection]],
    });

    for (const [, request] of closed_support_requests.entries()) {
      if (request.tecnico !== null) {
        const func = await Employee.findByPk(request.tecnico);

        request.dataValues.tecnico = func ? func.nome : null;
      }

      // Buscar mensagem do chamado
      const msg = await Mensagem.findOne({
        where: {
          chamado: request.chamado,
        },
      });

      // Adicionar campos mensagem, data_visita e visita
      request.dataValues.mensagem = msg ? msg.msg : null;
      request.dataValues.data_visita = request.visita
        ? format(
            new Date(
              request.visita.valueOf() +
                request.visita.getTimezoneOffset() * 60000
            ),
            'dd/MM/yyyy'
          )
        : null;
      request.dataValues.visita = request.visita
        ? format(addHours(request.visita, timeZoneOffset), 'HH:mm')
        : null;
    }

    const closed_array =
      orderDirection === 'DESC'
        ? [...closed_support_requests, ...closed_installation_requests]
        : [...closed_installation_requests, ...closed_support_requests];

    const response = {
      opened_requests: opened_array,
      closed_requests: closed_array,
      client,
    };

    return res.json(response);
    } catch (error) {
      console.error('Erro ao buscar histórico do cliente:', error);
      return res.status(500).json({ error: 'Erro ao buscar histórico do cliente' });
    }
  }
}

export default new HistoryController();
