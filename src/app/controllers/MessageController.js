/* eslint-disable eqeqeq */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import Mensagem from '../models/Mensagem';
import User from '../models/User';
import Client from '../models/Client';

class MessageController {
  async show(req, res) {
    const { chamado } = req.query;

    const notes = await Mensagem.findAll({
      where: {
        chamado,
      },
    });

    for (const [, item] of notes.entries()) {
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
