/* eslint-disable consistent-return */
/* eslint-disable no-unused-vars */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-nested-ternary */
import { Op } from 'sequelize';
import { endOfYear } from 'date-fns';

import Client from '../models/Client';
import Radacct from '../models/Radacct';

class SearchController {
  async index(req, res) {
    const { term, searchmode, filterBy } = req.query;

    if (term === '') {
      return res.json([]);
    }

    const filterBYOptions = [
      { id: 1, label: 'Nome ou CPF' },
      { id: 2, label: 'Caixa Hermética' },
      // { id: 3, label: 'Endereço'},
      // { id: 4, label: 'Vencimento'},
      { id: 5, label: 'SSID' },
    ];

    if (filterBy === '1') {
      if (isNaN(term)) {
        const clients = await Client.findAll({
          where: {
            cli_ativado: searchmode === 'enable' ? 's' : 'n',
            nome: {
              [Op.like]: `%${term}%`,
            },
          },
          attributes: ['id', 'nome', 'login'],
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

        const promises = clients.map(client => {
          return Radacct.findAll({
            where: {
              username: client.dataValues.login,
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

    if (filterBy === '2') {
      console.log('ASHUASHUAHSUAHSUHAUSHAUHSUAHSUAHUASH');
      const clients = await Client.findAll({
        where: {
          cli_ativado: searchmode === 'enable' ? 's' : 'n',
          caixa_herm: {
            [Op.like]: `%${term}%`,
          },
        },
        attributes: ['id', 'nome', 'login'],
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

      const promises = clients.map(client => {
        return Radacct.findAll({
          where: {
            username: client.dataValues.login,
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

    if (filterBy === '5') {
      const clients = await Client.findAll({
        where: {
          cli_ativado: searchmode === 'enable' ? 's' : 'n',
          ssid: {
            [Op.like]: `%${term}%`,
          },
        },
        attributes: ['id', 'nome', 'login'],
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

      const promises = clients.map(client => {
        return Radacct.findAll({
          where: {
            username: client.dataValues.login,
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
}

export default new SearchController();
