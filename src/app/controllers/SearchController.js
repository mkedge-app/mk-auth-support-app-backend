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
    const tenantId = req.headers.tenant_id || req.query.tenant_id;
    
    console.log(`🔍 Busca: termo="${term}", modo="${searchmode}", filtro="${filterBy}", tenantId="${tenantId}"`);
    
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
      const tenant = await Tenant.findById(tenantId);
      const useMkAuthAPI = tenant?.use_mka_api === true;
      
      console.log(`🚩 Feature Flag: use_mka_api = ${useMkAuthAPI}`);
      
      if (useMkAuthAPI) {
        console.log('🌐 Usando API MK-AUTH para busca de clientes');
        return await searchViaMkAuthAPI(req, res, term, searchmode, filterBy, tenantId);
      }

      console.log('💾 Usando banco de dados direto (modo legado)');
      return await searchViaDatabase(req, res, term, searchmode, filterBy);
    } catch (error) {
      console.error('❌ Erro na busca:', error);
      
      if (error.message && error.message.includes('MK-AUTH')) {
        console.log('⚠️  Erro na API MK-AUTH, usando fallback para banco de dados');
        return await searchViaDatabase(req, res, term, searchmode, filterBy);
      }
      
      return res.status(500).json({ error: 'Erro na busca de clientes' });
    }
  }
}

// 🌐 Busca via API MK-AUTH
async function searchViaMkAuthAPI(req, res, term, searchmode, filterBy, tenantId) {
  try {
    const mkAuthAPI = new MkAuthAPI(tenantId);
    
    console.log(`�� Chamando API MK-AUTH: listagem/clientes?busca=${term}`);
    
    const clientesAPI = await mkAuthAPI.getListagem('clientes', { busca: term });
    
    console.log(`✅ API retornou ${clientesAPI?.data?.length || 0} clientes`);
    
    const results = (clientesAPI.data || []).map(cliente => ({
      id: cliente.id_cliente,
      nome: cliente.nome,
      login: cliente.login,
      cpf_cnpj: cliente.cpf_cnpj,
      endereco_res: cliente.endereco,
      bairro_res: cliente.bairro,
      plano: cliente.plano?.nome || '',
      status: cliente.status,
      bloqueado: cliente.bloqueado === 'sim' ? 'S' : 'N',
    }));

    return res.json({
      results,
      info: {
        total: results.length,
        source: 'mk-auth-api',
      },
    });
  } catch (error) {
    console.error('❌ Erro ao buscar na API MK-AUTH:', error.message);
    console.log('⚠️  Fazendo fallback para banco de dados');
    return await searchViaDatabase(req, res, term, searchmode, filterBy);
  }
}

// 💾 Busca via banco de dados (modo atual/legado)
async function searchViaDatabase(req, res, term, searchmode, filterBy) {
  try {
    const termWithoutMask = term
      .replace(/\./g, '')
      .replace(/\//g, '')
      .replace(/-/g, '');

    const filter = isNaN(Number(termWithoutMask))
      ? {
          [Op.or]: [
            {
              nome: {
                [Op.like]: `%${term}%`,
              },
            },
            {
              fone: {
                [Op.like]: `%${termWithoutMask}%`,
              },
            },
            {
              celular: {
                [Op.like]: `%${termWithoutMask}%`,
              },
            },
            {
              login: {
                [Op.like]: `%${term}%`,
              },
            },
            {
              endereco_res: {
                [Op.like]: `%${term}%`,
              },
            },
          ],
        }
      : {
          [Op.or]: [
            {
              cpf_cnpj: {
                [Op.like]: `%${termWithoutMask}%`,
              },
            },
            {
              fone: {
                [Op.like]: `%${termWithoutMask}%`,
              },
            },
            {
              celular: {
                [Op.like]: `%${termWithoutMask}%`,
              },
            },
          ],
        };

    const clients = await Client.findAll({
      where: filter,
      attributes: [
        'id',
        'nome',
        'login',
        'endereco_res',
        'numero_res',
        'bairro_res',
        'complemento_res',
        'coordenadas',
        'cpf_cnpj',
        'fone',
        'celular',
        'plano',
        'bloqueado',
      ],
      order: [
        ['nome', 'ASC'],
        ['endereco_res', 'ASC'],
      ],
      limit: 70,
    });

    const info = {
      offline: 0,
      online: 0,
    };

    const results = await Promise.all(
      clients.map(async (client) => {
        const online = await ConnectedUsers.findOne({
          where: {
            login: client.login,
          },
        });

        if (online) {
          info.online += 1;
        } else {
          info.offline += 1;
        }

        return {
          ...client.dataValues,
          online: !!online,
        };
      })
    );

    return res.json({
      results,
      info: {
        ...info,
        source: 'database',
      },
    });
  } catch (error) {
    console.error('❌ Erro ao buscar no banco de dados:', error);
    return res.status(500).json({ error: 'Erro na busca de clientes' });
  }
}

export default new SearchController();
