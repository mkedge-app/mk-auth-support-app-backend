/* eslint-disable eqeqeq */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { format, addHours } from 'date-fns';

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
      msg_data,
    });

    return res.json(new_note);
  }

  async show(req, res) {
    const { chamado } = req.query;

    const notes = await Mensagem.findAll({
      where: {
        chamado,
      },
    });

    for (const [, item] of notes.entries()) {
      const timeZoneOffset = new Date().getTimezoneOffset() / 60;

      item.msg_data = format(
        addHours(item.msg_data, timeZoneOffset),
        `dd/MM/yyyy 'às' HH:mm:ss`
      );

      // Recupera os dados do usuário que originou a request
      const requester = await User.findOne({
        where: {
          idacesso: req.idacesso,
        },
      });

      if (item.dataValues.atendente === null) {
        // Recupera os dados do cliente
        const client = await Client.findOne({
          where: {
            login: item.dataValues.login,
          },
        });

        item.dataValues.atendente = client.nome;
      } else if (
        item.dataValues.atendente !== null &&
        item.dataValues.atendente.toLowerCase() == requester.login.toLowerCase()
      ) {
        item.dataValues.atendente = 'Você';
      }
    }

    return res.json(notes);
  }
}

export default new MessageController();
