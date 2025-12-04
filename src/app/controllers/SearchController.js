/* eslint-disable consistent-return */
/* eslint-disable no-unused-vars */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-nested-ternary */
import { Op } from 'sequelize';

import Client from '../models/Client';
import Invoice from '../models/Invoice';
import ConnectedUsers from '../models/ConnectedUsers';
import StaticMapHelper from '../helpers/StaticMapHelper';

// Função auxiliar para buscar faturas pendentes
async function getInvoiceInfo(login) {
  const pendingInvoices = await Invoice.findAll({
    where: {
      login,
      datadel: null,
      status: {
        [Op.or]: ['vencido', 'aberto'],
      },
    },
    order: [['datavenc', 'ASC']],
  });

  const pending_invoices = pendingInvoices.length;
  const next_due_date = pendingInvoices.length > 0 
    ? pendingInvoices[0].datavenc 
    : null;

  return { pending_invoices, next_due_date };
}

// Função auxiliar para extrair coordenadas e gerar URL do mapa
async function getLocationData(coordenadas) {
  if (!coordenadas) {
    return { latitude: null, longitude: null, static_map_url: null };
  }

  const [lat, lng] = coordenadas.split(',');
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const static_map_url = await StaticMapHelper.generateStaticMapUrl(latitude, longitude);

  return { latitude, longitude, static_map_url };
}

class SearchController {

  async index(req, res) {
    try {
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
          attributes: ['id', 'nome', 'login', 'coordenadas'],
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

        for (const [index, client] of clients.entries()) {
          const isConnected = connectedsArray.find(
            x => x.login === client.login
          );

          // Buscar informações de faturas
          const invoiceInfo = await getInvoiceInfo(client.login);

          // Extrair coordenadas e gerar URL do mapa
          const locationData = await getLocationData(client.coordenadas);

          clients[index] = {
            ...client.dataValues,
            equipment_array: isConnected ? 'Online' : 'Offline',
            pending_invoices: invoiceInfo.pending_invoices,
            next_due_date: invoiceInfo.next_due_date,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            static_map_url: locationData.static_map_url,
          };

          if (isConnected) {
            online += 1;
          } else {
            offline += 1;
          }
        }

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
        attributes: ['id', 'nome', 'login', 'coordenadas'],
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

      for (const [index, client] of clients.entries()) {
        const isConnected = connectedsArray.find(x => x.login === client.login);

        // Buscar informações de faturas
        const invoiceInfo = await getInvoiceInfo(client.login);

        // Extrair coordenadas e gerar URL do mapa
        const locationData = await getLocationData(client.coordenadas);

        clients[index] = {
          ...client.dataValues,
          equipment_array: isConnected ? 'Online' : 'Offline',
          pending_invoices: invoiceInfo.pending_invoices,
          next_due_date: invoiceInfo.next_due_date,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          static_map_url: locationData.static_map_url,
        };

        if (isConnected) {
          online += 1;
        } else {
          offline += 1;
        }
      }

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
        attributes: ['id', 'nome', 'login', 'coordenadas'],
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

      for (const [index, client] of clients.entries()) {
        const isConnected = connectedsArray.find(x => x.login === client.login);

        // Buscar informações de faturas
        const invoiceInfo = await getInvoiceInfo(client.login);

        // Extrair coordenadas e gerar URL do mapa
        const locationData = await getLocationData(client.coordenadas);

        clients[index] = {
          ...client.dataValues,
          equipment_array: isConnected ? 'Online' : 'Offline',
          pending_invoices: invoiceInfo.pending_invoices,
          next_due_date: invoiceInfo.next_due_date,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          static_map_url: locationData.static_map_url,
        };

        if (isConnected) {
          online += 1;
        } else {
          offline += 1;
        }
      }

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
        attributes: ['id', 'nome', 'login', 'coordenadas'],
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

      for (const [index, client] of clients.entries()) {
        const isConnected = connectedsArray.find(x => x.login === client.login);

        // Buscar informações de faturas
        const invoiceInfo = await getInvoiceInfo(client.login);

        // Extrair coordenadas e gerar URL do mapa
        const locationData = await getLocationData(client.coordenadas);

        clients[index] = {
          ...client.dataValues,
          equipment_array: isConnected ? 'Online' : 'Offline',
          pending_invoices: invoiceInfo.pending_invoices,
          next_due_date: invoiceInfo.next_due_date,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          static_map_url: locationData.static_map_url,
        };

        if (isConnected) {
          online += 1;
        } else {
          offline += 1;
        }
      }

      return res.json({
        results: clients,
        info: {
          online,
          offline,
        },
      });
    }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      return res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
  }
}

export default new SearchController();
