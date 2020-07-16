import { Op } from 'sequelize';
import Client from '../models/Client';

class SearchController {
  async index(req, res) {
    const { term } = req.query;

    if (term === '') {
      return res.json([]);
    }

    const clients = await Client.findAll({
      where: {
        nome: {
          [Op.like]: `%${term}%`,
        },
      },
      attributes: ['nome'],
    });

    return res.json(clients);
  }
}

export default new SearchController();
