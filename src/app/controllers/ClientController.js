import { Op } from 'sequelize';
import {
  subMonths,
  format,
  getDate,
  getDaysInMonth,
  addHours,
  endOfYear,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

import CTO from '../models/CTO';
import Client from '../models/Client';
import Radacct from '../models/Radacct';
import StaticMapHelper from '../helpers/StaticMapHelper';
import logger from '../../logger';
import logger from '../../logger';

class ClientController {
  async show(req, res) {
    try {
      const { id: client_id } = req.params;

      // Busca por login primeiro, depois por ID se não encontrar
      let client = await Client.findOne({ where: { login: client_id } });
      
      // Se não encontrou por login e client_id é numérico, tenta buscar por ID
      if (!client && !isNaN(client_id)) {
        client = await Client.findByPk(client_id);
      }

      if (!client) {
        return res.status(400).json({ message: 'No client not found' });
      }

    const current_month = format(new Date(), 'yyyy-MM-01 00:00:00');

    const client_connections = await Radacct.findAll({
      where: {
        username: client.login,
        acctstarttime: {
          [Op.gt]: current_month,
        },
      },
    });

    let dataUsage = 0;
    // eslint-disable-next-line array-callback-return
    client_connections.map(item => {
      dataUsage = dataUsage + item.acctinputoctets + item.acctoutputoctets;
    });

    const second_to_last_month = format(
      subMonths(new Date(), 1),
      'yyyy-MM-01 00:00:00'
    );

    const second_to_last_month_connections = await Radacct.findAll({
      where: {
        username: client.login,
        acctstarttime: {
          [Op.between]: [second_to_last_month, current_month],
        },
      },
    });

    let secondToLastDataUsage = 0;
    // eslint-disable-next-line array-callback-return
    second_to_last_month_connections.map(item => {
      secondToLastDataUsage =
        secondToLastDataUsage + item.acctinputoctets + item.acctoutputoctets;
    });

    const third_to_last_month = format(
      subMonths(new Date(), 2),
      'yyyy-MM-01 00:00:00'
    );

    const third_to_last_month_connections = await Radacct.findAll({
      where: {
        username: client.login,
        acctstarttime: {
          [Op.between]: [third_to_last_month, second_to_last_month],
        },
      },
    });

    let thirdToLastDataUsage = 0;
    // eslint-disable-next-line array-callback-return
    third_to_last_month_connections.map(item => {
      thirdToLastDataUsage =
        thirdToLastDataUsage + item.acctinputoctets + item.acctoutputoctets;
    });

    const forth_to_last_month = format(
      subMonths(new Date(), 3),
      'yyyy-MM-01 00:00:00'
    );

    const forth_to_last_month_connections = await Radacct.findAll({
      where: {
        username: client.login,
        acctstarttime: {
          [Op.between]: [forth_to_last_month, third_to_last_month],
        },
      },
    });

    let forthToLastDataUsage = 0;
    // eslint-disable-next-line array-callback-return
    forth_to_last_month_connections.map(item => {
      forthToLastDataUsage =
        forthToLastDataUsage + item.acctinputoctets + item.acctoutputoctets;
    });

    const fifith_to_last_month = format(
      subMonths(new Date(), 4),
      'yyyy-MM-01 00:00:00'
    );

    const fifith_to_last_month_connections = await Radacct.findAll({
      where: {
        username: client.login,
        acctstarttime: {
          [Op.between]: [fifith_to_last_month, forth_to_last_month],
        },
      },
    });

    let fifithToLastDataUsage = 0;
    // eslint-disable-next-line array-callback-return
    fifith_to_last_month_connections.map(item => {
      fifithToLastDataUsage =
        fifithToLastDataUsage + item.acctinputoctets + item.acctoutputoctets;
    });

    const sixth_to_last_month = format(
      subMonths(new Date(), 5),
      'yyyy-MM-01 00:00:00'
    );

    const sixth_to_last_month_connections = await Radacct.findAll({
      where: {
        username: client.login,
        acctstarttime: {
          [Op.between]: [sixth_to_last_month, fifith_to_last_month],
        },
      },
    });

    let sixthToLastDataUsage = 0;
    // eslint-disable-next-line array-callback-return
    sixth_to_last_month_connections.map(item => {
      sixthToLastDataUsage =
        sixthToLastDataUsage + item.acctinputoctets + item.acctoutputoctets;
    });

    const current_user_connection = await Radacct.findAll({
      where: {
        username: client.login,
        acctstarttime: {
          [Op.lte]: endOfYear(new Date()),
        },
      },
      limit: 1,
      order: [['acctstarttime', 'DESC']],
      attributes: ['acctstarttime', 'acctstoptime'],
    });

    const timeZoneOffset = new Date().getTimezoneOffset() / 60;

    let parsedDate = null;
    let parsedTime = null;

    if (current_user_connection.length !== 0) {
      const parsedAcctStartTime = addHours(
        current_user_connection[0].acctstarttime,
        timeZoneOffset
      );

      parsedDate = format(parsedAcctStartTime, 'dd/MM/yyyy');

      parsedTime = format(parsedAcctStartTime, 'HH:mm');
    }

    const days_in_current_month = getDate(new Date());

    const consuption_average = (
      dataUsage /
      1024 /
      1024 /
      1024 /
      days_in_current_month
    ).toFixed(2);

    const graph_obj = {
      labels: [
        format(subMonths(new Date(), 5), 'MMM', { locale: ptBR })
          .charAt(0)
          .toUpperCase() +
        format(subMonths(new Date(), 5), 'MMM', { locale: ptBR }).slice(1),
        format(subMonths(new Date(), 4), 'MMM', { locale: ptBR })
          .charAt(0)
          .toUpperCase() +
        format(subMonths(new Date(), 4), 'MMM', { locale: ptBR }).slice(1),
        format(subMonths(new Date(), 3), 'MMM', { locale: ptBR })
          .charAt(0)
          .toUpperCase() +
        format(subMonths(new Date(), 3), 'MMM', { locale: ptBR }).slice(1),
        format(subMonths(new Date(), 2), 'MMM', { locale: ptBR })
          .charAt(0)
          .toUpperCase() +
        format(subMonths(new Date(), 2), 'MMM', { locale: ptBR }).slice(1),
        format(subMonths(new Date(), 1), 'MMM', { locale: ptBR })
          .charAt(0)
          .toUpperCase() +
        format(subMonths(new Date(), 1), 'MMM', { locale: ptBR }).slice(1),
      ],
      datasets: [
        {
          data: [
            (sixthToLastDataUsage / 1024 / 1024 / 1024).toFixed(2),
            (fifithToLastDataUsage / 1024 / 1024 / 1024).toFixed(2),
            (forthToLastDataUsage / 1024 / 1024 / 1024).toFixed(2),
            (thirdToLastDataUsage / 1024 / 1024 / 1024).toFixed(2),
            (secondToLastDataUsage / 1024 / 1024 / 1024).toFixed(2),
          ],
        },
      ],
    };

    let finance_state = null;

    if (client.bloqueado === 'sim') {
      finance_state = 'Bloqueado';
    } else if (client.observacao === 'sim') {
      finance_state = 'Em observação';
    } else {
      finance_state = 'Liberado';
    }

    let equipment_status = 'Offline';
    if (current_user_connection.length !== 0) {
      const nullConnection = current_user_connection.find(connection => {
        if (connection.acctstoptime === null) {
          return connection;
        }
      });

      equipment_status = nullConnection ? 'Online' : 'Offline';
    }

    // Verifica se a caixa hermética do cliente é uma caixa cadastrada na MP_Caixas
    const cto = await CTO.findOne({
      where: {
        nome: client.caixa_herm,
      },
    });

    client.caixa_herm = cto ? client.caixa_herm : null;

    // Extrair latitude e longitude das coordenadas
    let latitude = null;
    let longitude = null;
    if (client.coordenadas) {
      [latitude, longitude] = client.coordenadas.split(',');
      latitude = parseFloat(latitude);
      longitude = parseFloat(longitude);
    }

    // Gerar URL do mapa estático
    const static_map_url = await StaticMapHelper.generateStaticMapUrl(
      latitude,
      longitude
    );

    const response = {
      ...client.dataValues,
      finance_state,
      current_data_usage: (dataUsage / 1024 / 1024 / 1024).toFixed(2),
      consuption_average,
      expected_consuption: (
        consuption_average * getDaysInMonth(new Date())
      ).toFixed(2),
      second_to_last_data_usage: secondToLastDataUsage / 1024 / 1024 / 1024,
      third_to_last_data_usage: thirdToLastDataUsage / 1024 / 1024 / 1024,
      current_user_connection:
        parsedDate !== null
          ? `${parsedDate} às ${parsedTime}`
          : 'Não há conexões',
      equipment_status,
      graph_obj,
      latitude,
      longitude,
      static_map_url,
    };

    return res.json(response);
    } catch (error) {
      console.error('Erro ao buscar dados do cliente:', error);
      return res.status(500).json({ error: 'Erro ao buscar dados do cliente' });
    }
  }

  async update(req, res) {
    try {
      const { id: client_id } = req.params;

      console.log(`📥 req.body completo:`, JSON.stringify(req.body, null, 2));

      let {
        latitude,
        longitude,
        new_cto,
        caixa_herm,  // Frontend pode enviar com este nome
        observacao,
        date,
        celular,
        fone,
        endereco_res,
        numero_res,
        bairro_res,
        complemento_res,
        automac,
        coordenadas,
      } = req.body;

    // Normalizar o nome do campo CTO (aceita tanto new_cto quanto caixa_herm)
    if (!new_cto && caixa_herm) {
      new_cto = caixa_herm;
    }

    // Se coordenadas vier como string única, separar em latitude e longitude
    if (coordenadas && typeof coordenadas === 'string' && coordenadas.includes(',')) {
      const [lat, lng] = coordenadas.split(',').map(c => c.trim());
      latitude = latitude || parseFloat(lat);
      longitude = longitude || parseFloat(lng);
      console.log(`📍 Coordenadas parseadas: lat=${latitude}, lng=${longitude}`);
    }

    console.log(`🔄 Atualizando cliente ID ${client_id}:`, {
      endereco_res,
      numero_res,
      bairro_res,
      complemento_res,
      celular,
      fone,
      latitude,
      longitude,
      coordenadas,
      new_cto,
      caixa_herm,
      observacao,
      date,
      automac
    });

    // Busca por login primeiro, depois por ID se não encontrar
    let client = await Client.findOne({ where: { login: client_id } });
    
    // Se não encontrou por login e client_id é numérico, tenta buscar por ID
    if (!client && !isNaN(client_id)) {
      client = await Client.findByPk(client_id);
    }

    if (!client) {
      return res.status(400).json({ message: 'No client not found' });
    }

    console.log(`📋 Cliente encontrado: ID=${client.id}, Login=${client.login}, Nome=${client.nome}`);

    if (new_cto !== undefined && new_cto !== null) {
      client.caixa_herm = new_cto;
    }

    if ((latitude !== undefined && latitude !== null) && (longitude !== undefined && longitude !== null)) {
      client.coordenadas = `${latitude},${longitude}`;
    }

    if (observacao !== undefined && observacao !== null) {
      client.observacao = observacao;

      if (date !== null && date !== undefined && date !== '') {
        try {
          const parsedDate = parseISO(date);
          // Verifica se a data é válida
          if (!isNaN(parsedDate.getTime())) {
            client.rem_obs = format(parsedDate, 'yyyy-MM-dd 00:00:00');
          }
        } catch (err) {
          console.error('Erro ao parsear data:', err);
        }
      }
    }

    if (celular !== undefined && celular !== null) {
      client.celular = celular;
    }

    if (fone !== undefined && fone !== null) {
      client.fone = fone;
    }

    // Atualiza campos de endereço individualmente se fornecidos
    if (endereco_res !== undefined && endereco_res !== null) {
      client.endereco_res = endereco_res;
    }

    if (numero_res !== undefined && numero_res !== null) {
      client.numero_res = numero_res;
    }

    if (bairro_res !== undefined && bairro_res !== null) {
      client.bairro_res = bairro_res;
    }

    if (complemento_res !== undefined && complemento_res !== null) {
      client.complemento_res = complemento_res;
    }

    if (automac) {
      client.mac = null;
      client.automac = 'sim';
    }

    await client.save();

    console.log(`✅ Cliente ${client_id} atualizado com sucesso`);

    return res.json(client);
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      return res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
  }
}

export default new ClientController();
