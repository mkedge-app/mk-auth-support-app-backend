/* eslint-disable consistent-return */
/* eslint-disable no-unused-vars */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-nested-ternary */
import { Op } from 'sequelize';

import Client from '../models/Client';
import ConnectedUsers from '../models/ConnectedUsers';
import Tenant from '../schemas/Tenant';
import MkAuthAPI from '../helpers/MkAuthAPI';

class SearchController {
  async index(req, res) {
    const { term, searchmode, filterBy } = req.query;
    const tenantId = req.headers.tenant_id;

    console.log(`🔍 Busca: termo="${term}", modo="${searchmode}", filtro="${filterBy}"`);

    if (term === '') {
      return res.json({
        results: [],
        info: {
          offline: 0,
          online: 0,
        },
      });
    }

    try {
      // Verificar se deve usar API MK-AUTH
      const tenant = await Tenant.findById(tenantId);
      const useMkAuthAPI = tenant?.use_mka_api === true;

      console.log(`🚩 Feature Flag: use_mka_api = ${useMkAuthAPI}`);

      // Se API MK-AUTH estiver ativada, usar ela
      if (useMkAuthAPI) {
        console.log('🌐 Usando API MK-AUTH para busca de clientes');
        return await this.searchViaMkAuthAPI(req, res, term, searchmode, filterBy, tenantId);
      }

      // Caso contrário, usar banco de dados direto (modo atual)
      console.log('💾 Usando banco de dados direto (modo legado)');
      return await this.searchViaDatabase(req, res, term, searchmode, filterBy);
    } catch (error) {
      console.error('❌ Erro na busca:', error);
      
      // Em caso de erro na API, fazer fallback para banco de dados
      if (error.message.includes('MK-AUTH')) {
        console.log('⚠️  Erro na API MK-AUTH, usando fallback para banco de dados');
        return await this.searchViaDatabase(req, res, term, searchmode, filterBy);
      }
      
      return res.status(500).json({ error: 'Erro ao realizar busca' });
    }
  }

  async searchViaMkAuthAPI(req, res, term, searchmode, filterBy, tenantId) {
    try {
      const mkAuth = new MkAuthAPI(tenantId);

      // Buscar clientes na API MK-AUTH
      const params = {
        busca: term,
        ativo: searchmode === 'enable' ? 's' : 'n',
      };

      // Adicionar filtro específico se necessário
      if (filterBy === '2') {
        params.caixa_herm = term;
      } else if (filterBy === '5') {
        params.ssid = term;
      }

      const response = await mkAuth.getClientes(params);
      let clients = response.data || response || [];

      // Normalizar dados da API para formato esperado
      clients = clients.map(c => ({
        id: c.id,
        nome: c.nome,
        login: c.login,
      }));

      // Buscar status online/offline (ainda usa banco local pois é tempo real)
      const connectedsArray = await ConnectedUsers.findAll();

      let online = 0;
      let offline = 0;

      clients = clients.map(client => {
        const isConnected = connectedsArray.find(x => x.login === client.login);
        
        if (isConnected) {
          online += 1;
        } else {
          offline += 1;
        }

        return {
          ...client,
          equipment_array: isConnected ? 'Online' : 'Offline',
        };
      });

      // Ordenar por nome
      clients.sort((a, b) => {
        if (a.nome < b.nome) return -1;
        if (a.nome > b.nome) return 1;
        return 0;
      });

      console.log(`✅ API MK-AUTH retornou ${clients.length} clientes`);

      return res.json({
        results: clients,
        info: {
          online,
          offline,
        },
        source: 'mk-auth-api',  // Indicador de fonte de dados
      });
    } catch (error) {
      console.error('❌ Erro ao buscar via API MK-AUTH:', error.message);
      throw error; // Será capturado pelo fallback no index()
    }
  }

  async searchViaDatabase(req, res, term, searchmode, filterBy) {
    const connectedsArray = await ConnectedUsers.findAll();

    let whereClause = {
      cli_ativado: searchmode === 'enable' ? 's' : 'n',
    };

    // Filtro por nome ou CPF
    if (filterBy === '1') {
      if (isNaN(term)) {
        whereClause.nome = { [Op.like]: `%${term}%` };
      } else {
        whereClause.cpf_cnpj = { [Op.like]: `%${term}%` };
      }
    }
    // Filtro por caixa hermética
    else if (filterBy === '2') {
      whereClause.caixa_herm = { [Op.like]: `%${term}%` };
    }
    // Filtro por SSID
    else if (filterBy === '5') {
      whereClause.ssid = { [Op.like]: `%${term}%` };
    }

    const clients = await Client.findAll({
      where: whereClause,
      attributes: ['id', 'nome', 'login'],
    });

    clients.sort((a, b) => {
      if (a.nome < b.nome) return -1;
      if (a.nome > b.nome) return 1;
      return 0;
    });

    let online = 0;
    let offline = 0;

    const resultsWithStatus = clients.map(client => {
      const isConnected = connectedsArray.find(x => x.login === client.login);

      if (isConnected) {
        online += 1;
      } else {
        offline += 1;
      }

      return {
        ...client.dataValues,
        equipment_array: isConnected ? 'Online' : 'Offline',
      };
    });

    console.log(`✅ Banco de dados retornou ${resultsWithStatus.length} clientes`);

    return res.json({
      results: resultsWithStatus,
      info: {
        online,
        offline,
      },
      source: 'database',  // Indicador de fonte de dados
    });
  }
}

export default new SearchController();
