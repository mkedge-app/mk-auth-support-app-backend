/* eslint-disable consistent-return */
/* eslint-disable no-unused-vars */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-nested-ternary */
import { Op } from 'sequelize';

import Client from '../models/Client';
import ConnectedUsers from '../models/ConnectedUsers';
import SupportRequest from '../models/SupportRequest';

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

    // Determinar campo de busca
    let searchField;
    if (filterBy === '1') {
      searchField = isNaN(term) ? 'nome' : 'cpf_cnpj';
    } else if (filterBy === '2') {
      searchField = 'caixa_herm';
    } else if (filterBy === '5') {
      searchField = 'ssid';
    } else {
      return res.status(400).json({ error: 'Invalid filterBy parameter' });
    }

    // Buscar clientes e usuários conectados em paralelo
    const [clients, connectedUsers, recentRequests] = await Promise.all([
      Client.findAll({
        where: {
          cli_ativado: searchmode === 'enable' ? 's' : 'n',
          [searchField]: {
            [Op.like]: `%${term}%`,
          },
        },
        attributes: ['id', 'nome', 'login', 'celular', 'fone', 'plano'],
      }),
      ConnectedUsers.findAll({
        attributes: ['login'],
        raw: true,
      }),
      SupportRequest.findAll({
        where: {
          login: {
            [Op.like]: `%${term}%`,
          },
          status: {
            [Op.notIn]: ['Fechado', 'fechado', 'FECHADO'],
          },
        },
        attributes: ['login', 'chamado', 'assunto', 'visita'],
        order: [['id', 'DESC']],
        limit: 50,
        raw: true,
      }),
    ]);

    // Criar Map de usuários conectados para lookup O(1)
    const connectedMap = {};
    connectedUsers.forEach(user => {
      connectedMap[user.login] = true;
    });

    // Criar Map de chamados por login
    const requestsMap = {};
    recentRequests.forEach(req => {
      if (!requestsMap[req.login]) {
        requestsMap[req.login] = [];
      }
      if (requestsMap[req.login].length < 3) {
        requestsMap[req.login].push({
          chamado: req.chamado,
          assunto: req.assunto,
          visita: req.visita,
        });
      }
    });

    // Processar resultados
    let online = 0;
    let offline = 0;

    const results = clients.map(client => {
      const isOnline = !!connectedMap[client.login];
      const chamados = requestsMap[client.login] || [];
      
      if (isOnline) {
        online += 1;
      } else {
        offline += 1;
      }

      return {
        id: client.id,
        nome: client.nome,
        login: client.login,
        celular: client.celular,
        fone: client.fone,
        plano: client.plano,
        equipment_array: isOnline ? 'Online' : 'Offline',
        chamados_abertos: chamados.length,
        ultimos_chamados: chamados,
      };
    });

    // Ordenar por nome
    results.sort((a, b) => a.nome.localeCompare(b.nome));

    return res.json({
      results,
      info: {
        online,
        offline,
        total: results.length,
      },
    });
  }
}

export default new SearchController();
