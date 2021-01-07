/* eslint-disable consistent-return */
/* eslint-disable no-unused-vars */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-nested-ternary */
import { Op } from 'sequelize';

import Client from '../models/Client';
import ConnectedUsers from '../models/ConnectedUsers';

class SearchController {
  async index(req, res) {
    const { term, searchmode, filterBy } = req.query;

    if (term === '') {
      return res.json({
        results: [],
        info: {
          offline: 0,
          online: 0,
        },
      });
    }

    const filterBYOptions = [
      { id: 1, label: 'Nome ou CPF' },
      { id: 2, label: 'Caixa Hermética' },
      // { id: 3, label: 'Endereço'},
      // { id: 4, label: 'Vencimento'},
      { id: 5, label: 'SSID' },
    ];

    const connectedsArray = await ConnectedUsers.findAll();

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

        let online = 0;
        let offline = 0;

        clients.forEach((client, index) => {
          const isConnected = connectedsArray.find(
            x => x.login === client.login
          );

          clients[index] = {
            ...client.dataValues,
            equipment_array: isConnected ? 'Online' : 'Offline',
          };

          if (isConnected) {
            online += 1;
          } else {
            offline += 1;
          }
        });

        return res.json({
          results: clients,
          info: {
            online,
            offline,
          },
        });
      }

      const clients = await Client.findAll({
        where: {
          cli_ativado: searchmode === 'enable' ? 's' : 'n',
          cpf_cnpj: {
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

      let online = 0;
      let offline = 0;

      clients.forEach((client, index) => {
        const isConnected = connectedsArray.find(x => x.login === client.login);

        clients[index] = {
          ...client.dataValues,
          equipment_array: isConnected ? 'Online' : 'Offline',
        };

        if (isConnected) {
          online += 1;
        } else {
          offline += 1;
        }
      });

      return res.json({
        results: clients,
        info: {
          online,
          offline,
        },
      });
    }

    if (filterBy === '2') {
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

      let online = 0;
      let offline = 0;

      clients.forEach((client, index) => {
        const isConnected = connectedsArray.find(x => x.login === client.login);

        clients[index] = {
          ...client.dataValues,
          equipment_array: isConnected ? 'Online' : 'Offline',
        };

        if (isConnected) {
          online += 1;
        } else {
          offline += 1;
        }
      });

      return res.json({
        results: clients,
        info: {
          online,
          offline,
        },
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

      let online = 0;
      let offline = 0;

      clients.forEach((client, index) => {
        const isConnected = connectedsArray.find(x => x.login === client.login);

        clients[index] = {
          ...client.dataValues,
          equipment_array: isConnected ? 'Online' : 'Offline',
        };

        if (isConnected) {
          online += 1;
        } else {
          offline += 1;
        }
      });

      return res.json({
        results: clients,
        info: {
          online,
          offline,
        },
      });
    }
  }
}

export default new SearchController();
