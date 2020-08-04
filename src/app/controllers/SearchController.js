import { Op } from 'sequelize';
import Client from '../models/Client';

class SearchController {
  async index(req, res) {
    const { term } = req.query;

    if (term === '') {
      return res.json([]);
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

    return res.json(clients);
  }
}

export default new SearchController();
