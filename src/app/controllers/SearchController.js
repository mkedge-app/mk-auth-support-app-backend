import { Op } from 'sequelize';
import { endOfYear } from 'date-fns';

import Client from '../models/Client';
import Radacct from '../models/Radacct';

class SearchController {
  // eslint-disable-next-line consistent-return
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
        attributes: ['id', 'nome', 'login'],
      });

      const promises = clients.map(client => {
        return Radacct.findAll({
          where: {
            username: client.login,
            acctstarttime: {
              [Op.lte]: endOfYear(new Date()),
            },
          },
          limit: 1,
          order: [['acctstarttime', 'DESC']],
          attributes: ['acctstoptime'],
        });
      });

      Promise.all(promises).then(response => {
        const equipment_array = [];
        // eslint-disable-next-line array-callback-return
        response.map(item => {
          if (item.length !== 0) {
            let equipment_status = 'Offline';
            equipment_status =
              item[0].acctstoptime === null ? 'Online' : 'Offline';

            equipment_array.push(equipment_status);
          } else {
            const equipment_status = 'Offline';
            equipment_array.push(equipment_status);
          }
        });

        clients.forEach((client, index) => {
          clients[index] = {
            ...client.dataValues,
            equipment_array: equipment_array[index],
          };
        });

        return res.json(clients);
      });
    }

    const clients = await Client.findAll({
      where: {
        cpf_cnpj: {
          [Op.like]: `%${term}%`,
        },
      },
      attributes: ['id', 'nome', 'login'],
    });

    const promises = clients.map(client => {
      return Radacct.findAll({
        where: {
          username: client.login,
          acctstarttime: {
            [Op.lte]: endOfYear(new Date()),
          },
        },
        limit: 1,
        order: [['acctstarttime', 'DESC']],
        attributes: ['acctstoptime'],
      });
    });

    Promise.all(promises).then(response => {
      const equipment_array = [];
      // eslint-disable-next-line array-callback-return
      response.map(item => {
        if (item.length !== 0) {
          let equipment_status = 'Offline';
          equipment_status =
            item[0].acctstoptime === null ? 'Online' : 'Offline';

          equipment_array.push(equipment_status);
        } else {
          const equipment_status = 'Offline';
          equipment_array.push(equipment_status);
        }
      });

      clients.forEach((client, index) => {
        clients[index] = {
          ...client.dataValues,
          equipment_array: equipment_array[index],
        };
      });

      return res.json(clients);
    });
  }
}

export default new SearchController();
