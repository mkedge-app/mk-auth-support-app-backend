/* eslint-disable no-await-in-loop */
/* eslint-disable array-callback-return */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
import { Op } from 'sequelize';
import { startOfToday, format, addHours } from 'date-fns';

import Client from '../models/Client';
import Mensagem from '../models/Mensagem';
import Employee from '../models/Employee';
import SupportRequest from '../models/SupportRequest';
import ConnectedUsers from '../models/ConnectedUsers';
import User from '../models/User';

class OverdueRequestController {
  async index(req, res) {
    try {
      const { sortMode } = req.query;
      const orderDirection = sortMode || 'ASC';

    const overdueArray = await SupportRequest.findAll({
      where: {
        visita: {
          [Op.lt]: startOfToday(),
        },
        status: 'aberto',
      },
      order: [['visita', orderDirection]],
    });

    const groups = {};
    const timeZoneOffset = new Date().getTimezoneOffset() / 60;

    for (const [, request] of overdueArray.entries()) {
      const { login, chamado, tecnico } = request;

      const response = await Client.findOne({
        where: {
          login,
        },
      });

      const msg = await Mensagem.findOne({
        where: {
          chamado,
        },
        order: [['msg_data', 'DESC']],
      });

      const employee = await Employee.findByPk(tecnico);

      // Verificar se cliente está online
      const isConnected = await ConnectedUsers.findOne({
        where: { login },
      });

      // Buscar usuário que abriu o chamado
      let opened_by_name = null;
      if (request.atendente) {
        const openedByUser = await User.findOne({
          where: { login: request.atendente },
        });
        opened_by_name = openedByUser ? openedByUser.nome : request.atendente;
      }

      // Buscar usuário que fechou o chamado (se foi fechado)
      let closed_by_name = null;
      if (request.login_atend) {
        const closedByUser = await User.findOne({
          where: { login: request.login_atend },
        });
        closed_by_name = closedByUser ? closedByUser.nome : request.login_atend;
      }

      const obj = {
        id: request.id,
        visita: request.visita,
        data_visita: request.visita
          ? format(
              new Date(
                request.visita.valueOf() +
                  request.visita.getTimezoneOffset() * 60000
              ),
              'dd/MM/yyyy'
            )
          : null,
        nome: request.nome,
        login: response.login,
        senha: response.senha,
        plano: response.plano,
        tipo: response.tipo,
        ip: response.ip,
        status: request.status,
        prioridade: request.prioridade,
        assunto: request.assunto,
        endereco: response.endereco_res,
        numero: response.numero_res,
        bairro: response.bairro_res,
        // Campos de contato do cliente
        // telefone: response.fone || null, // Campo não existe em SupportRequest
        celular: response.celular || null,
        mensagem: msg ? msg.msg : null,
        employee_name: employee === null ? null : employee.nome,
        cliente_status_online: isConnected ? 'Online' : 'Offline',
        aberto_por: opened_by_name,
        fechado_por: closed_by_name,
      };

      const date = format(obj.visita, "dd 'de' MMM 'de' yyyy");

      const visit_time = format(addHours(obj.visita, timeZoneOffset), 'HH:mm');

      obj.visita = visit_time;

      if (groups[date] === undefined) {
        groups[date] = [obj];
      } else {
        groups[date].push(obj);
      }
    }

    const response = [];
    Object.keys(groups).map(key => {
      const obj = {
        date_group: key,
        cards: groups[key],
      };

      response.push(obj);
    });

    return res.json(response);
    } catch (error) {
      console.error('Erro ao buscar chamados atrasados:', error);
      return res.status(500).json([]);
    }
  }
}

export default new OverdueRequestController();
