/* eslint-disable no-nested-ternary */
import { Op } from 'sequelize';
import Client from '../models/Client';

class SearchController {
  async index(req, res) {
    const { term, searchmode } = req.query;

    if (term === '') {
      return res.json([]);
    }

    if (searchmode === 'all') {
      // eslint-disable-next-line no-restricted-globals
      if (isNaN(term)) {
        const clients = await Client.findAll({
          where: {
            nome: {
              [Op.like]: `%${term}%`,
            },
          },
          attributes: ['id', 'nome'],
        });

        clients.sort((a, b) => {
          if (a.nome < b.nome) {
            return -1;
          }
          if (a.nome > b.nome) {
            return 1;
          }
          return 0;
        });

        return res.json(clients);
      }
      // eslint-disable-next-line no-restricted-globals
    } else if (isNaN(term)) {
      const clients = await Client.findAll({
        where: {
          cli_ativado: searchmode === 'enable' ? 's' : 'n',
          nome: {
            [Op.like]: `%${term}%`,
          },
        },
        attributes: ['id', 'nome'],
      });

      clients.sort((a, b) => {
        if (a.nome < b.nome) {
          return -1;
        }
        if (a.nome > b.nome) {
          return 1;
        }
        return 0;
      });

      return res.json(clients);
    }

    // eslint-disable-next-line no-restricted-globals
    if (isNaN(term)) {
      const clients = await Client.findAll({
        where: {
          nome: {
            [Op.like]: `%${term}%`,
          },
        },
        attributes: ['id', 'nome'],
      });

      clients.sort((a, b) => {
        if (a.nome < b.nome) {
          return -1;
        }
        if (a.nome > b.nome) {
          return 1;
        }
        return 0;
      });

      return res.json(clients);
    }

    const clients = await Client.findAll({
      where: {
        cpf_cnpj: {
          [Op.like]: `%${term}%`,
        },
      },
      attributes: ['id', 'nome'],
    });

    clients.sort((a, b) => {
      if (a.nome < b.nome) {
        return -1;
      }
      if (a.nome > b.nome) {
        return 1;
      }
      return 0;
    });

    return res.json(clients);
  }
}

export default new SearchController();
