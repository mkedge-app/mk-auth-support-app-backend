import { Op, literal } from 'sequelize';
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
import SupportRequest from '../models/SupportRequest';
import Invoice from '../models/Invoice';

class ClientController {
  async show(req, res) {
    const { id: client_id } = req.params;

    const client = await Client.findByPk(client_id);

    if (!client) {
      return res.status(400).json({ message: 'No client not found' });
    }

    // Calcular datas dos últimos 6 meses
    const months = [];
    for (let i = 0; i < 6; i++) {
      months.push({
        start: format(subMonths(new Date(), i), 'yyyy-MM-01 00:00:00'),
        end: i === 0 ? format(new Date(), 'yyyy-MM-dd HH:mm:ss') : format(subMonths(new Date(), i - 1), 'yyyy-MM-01 00:00:00'),
        label: format(subMonths(new Date(), i), 'MMM', { locale: ptBR }).charAt(0).toUpperCase() + format(subMonths(new Date(), i), 'MMM', { locale: ptBR }).slice(1),
      });
    }

    // Buscar todos os dados em paralelo
    const [connections, lastConnection, cto, recentRequests, pendingInvoices] = await Promise.all([
      // Conexões dos últimos 6 meses em uma query
      Radacct.findAll({
        attributes: [
          [literal('DATE_FORMAT(acctstarttime, "%Y-%m")'), 'month'],
          [literal('SUM(acctinputoctets + acctoutputoctets)'), 'total_bytes'],
        ],
        where: {
          username: client.login,
          acctstarttime: {
            [Op.gte]: months[5].start,
          },
        },
        group: [literal('DATE_FORMAT(acctstarttime, "%Y-%m")')],
        raw: true,
      }),

      // Última conexão
      Radacct.findOne({
        where: {
          username: client.login,
          acctstarttime: {
            [Op.lte]: endOfYear(new Date()),
          },
        },
        order: [['acctstarttime', 'DESC']],
        attributes: ['acctstarttime', 'acctstoptime'],
      }),

      // CTO
      CTO.findOne({
        where: {
          nome: client.caixa_herm,
        },
      }),

      // Últimos 5 chamados
      SupportRequest.findAll({
        where: {
          login: client.login,
        },
        order: [['id', 'DESC']],
        limit: 5,
        attributes: ['id', 'chamado', 'assunto', 'status', 'visita', 'prioridade'],
        raw: true,
      }),

      // Faturas pendentes
      Invoice.findAll({
        where: {
          login: client.login,
          status: {
            [Op.in]: ['aberto', 'vencido'],
          },
        },
        order: [['datavenc', 'ASC']],
        limit: 3,
        attributes: ['id', 'datavenc', 'valor', 'status'],
        raw: true,
      }),
    ]);

    // Criar mapa de consumo por mês
    const consumptionMap = {};
    connections.forEach(conn => {
      consumptionMap[conn.month] = parseInt(conn.total_bytes) || 0;
    });

    // Calcular consumo dos últimos 6 meses
    const monthlyData = months.reverse().map(month => {
      const monthKey = format(new Date(month.start), 'yyyy-MM');
      const bytes = consumptionMap[monthKey] || 0;
      return {
        label: month.label,
        gb: (bytes / 1024 / 1024 / 1024).toFixed(2),
        bytes,
      };
    });

    // Consumo do mês atual
    const currentMonthData = monthlyData[monthlyData.length - 1];
    const dataUsage = currentMonthData.bytes;

    // Calcular médias
    const days_in_current_month = getDate(new Date());
    const consuption_average = (dataUsage / 1024 / 1024 / 1024 / days_in_current_month).toFixed(2);

    // Processar última conexão
    const timeZoneOffset = new Date().getTimezoneOffset() / 60;
    let parsedDate = null;
    let parsedTime = null;
    let equipment_status = 'Offline';

    if (lastConnection) {
      const parsedAcctStartTime = addHours(lastConnection.acctstarttime, timeZoneOffset);
      parsedDate = format(parsedAcctStartTime, 'dd/MM/yyyy');
      parsedTime = format(parsedAcctStartTime, 'HH:mm');
      equipment_status = lastConnection.acctstoptime === null ? 'Online' : 'Offline';
    }

    // Estado financeiro
    let finance_state = null;
    if (client.bloqueado === 'sim') {
      finance_state = 'Bloqueado';
    } else if (client.observacao === 'sim') {
      finance_state = 'Em observação';
    } else {
      finance_state = 'Liberado';
    }

    // Objeto do gráfico
    const graph_obj = {
      labels: monthlyData.map(m => m.label),
      datasets: [
        {
          data: monthlyData.map(m => m.gb),
        },
      ],
    };

    const response = {
      ...client.dataValues,
      caixa_herm: cto ? client.caixa_herm : null,
      finance_state,
      current_data_usage: (dataUsage / 1024 / 1024 / 1024).toFixed(2),
      consuption_average,
      expected_consuption: (consuption_average * getDaysInMonth(new Date())).toFixed(2),
      current_user_connection: parsedDate !== null ? `${parsedDate} às ${parsedTime}` : 'Não há conexões',
      equipment_status,
      graph_obj,
      chamados_recentes: recentRequests,
      faturas_pendentes: pendingInvoices,
      total_chamados: recentRequests.length,
      total_faturas_pendentes: pendingInvoices.length,
    };

    return res.json(response);
  }

  async update(req, res) {
    const { id: client_id } = req.params;

    const {
      latitude,
      longitude,
      new_cto,
      observacao,
      date,
      celular,
      fone,
      endereco_res,
      numero_res,
      bairro_res,
      automac,
    } = req.body;

    const client = await Client.findByPk(client_id);

    if (!client) {
      return res.status(400).json({ message: 'No client not found' });
    }

    if (new_cto) {
      client.caixa_herm = new_cto;
    }

    if (latitude && longitude) {
      client.coordenadas = `${latitude},${longitude}`;
    }

    if (observacao) {
      client.observacao = observacao;

      if (date !== null) {
        client.rem_obs = format(parseISO(date), 'yyyy-MM-dd 00:00:00');
      }
    }

    if (celular) {
      client.celular = celular;
    }

    if (fone) {
      client.fone = fone;
    }

    if (endereco_res && numero_res && bairro_res) {
      client.endereco_res = endereco_res;
      client.numero_res = numero_res;
      client.bairro_res = bairro_res;
    }

    if (automac) {
      client.mac = null;
      client.automac = 'sim';
    }

    await client.save();

    return res.json(client);
  }
}

export default new ClientController();
