/* eslint-disable eqeqeq */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { format, addHours } from 'date-fns';
import { Op } from 'sequelize';

import Mensagem from '../models/Mensagem';
import User from '../models/User';
import Client from '../models/Client';

class MessageController {
  async store(req, res) {
    const { chamado } = req.query;
    const { msg, msg_data } = req.body;

    const requester = await User.findOne({
      where: {
        idacesso: req.idacesso,
      },
    });

    const new_note = await Mensagem.create({
      chamado,
      msg,
      tipo: 'mk-edge',
      login: requester.login,
      atendente: requester.nome,
      msg_data: msg_data || new Date(),
    });

    return res.json(new_note);
  }

  async show(req, res) {
    const { chamado } = req.query;

    // Busca o usuário uma única vez
    const requester = await User.findOne({
      where: {
        idacesso: req.idacesso,
      },
    });

    const notes = await Mensagem.findAll({
      where: {
        chamado,
        msg: {
          [Op.ne]: null,
        },
        tipo: {
          [Op.ne]: 'F5F5F5',
        },
      },
      order: [['id', 'ASC']],
      raw: true,
    });

    // Coletar logins únicos para buscar clientes
    const clientLogins = notes
      .filter(note => note.atendente === null)
      .map(note => note.login)
      .filter(Boolean);

    // Buscar todos os clientes de uma vez
    const clients = await Client.findAll({
      where: {
        login: {
          [Op.in]: clientLogins.length > 0 ? clientLogins : [''],
        },
      },
    });

    // Criar mapa de clientes
    const clientsMap = {};
    clients.forEach(client => {
      clientsMap[client.login] = client;
    });

    // Processar notas
    for (const item of notes) {
      // Formatar data se existir
      if (item.msg_data) {
        const timeZoneOffset = new Date().getTimezoneOffset() / 60;
        item.msg_data = format(
          addHours(new Date(item.msg_data), timeZoneOffset),
          `dd/MM/yyyy 'às' HH:mm:ss`
        );
      } else {
        item.msg_data = 'Sem data';
      }

      // Preencher atendente
      if (item.atendente === null) {
        const client = clientsMap[item.login];
        item.atendente = client ? client.nome : 'Cliente';
      } else if (
        item.atendente !== null &&
        item.atendente.toLowerCase() == requester.login.toLowerCase()
      ) {
        item.atendente = 'Você';
      }
    }

    return res.json(notes);
  }
}

export default new MessageController();
