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

class OverdueRequestController {
  async index(req, res) {
    const { sortMode } = req.query;

    const overdueArray = await SupportRequest.findAll({
      where: {
        visita: {
          [Op.lt]: startOfToday(),
        },
        status: 'aberto',
      },
      order: [['visita', sortMode]],
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
      });

      const employee = await Employee.findByPk(tecnico);

      const obj = {
        id: request.id,
        visita: request.visita,
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
        mensagem: msg ? msg.msg : null,
        employee_name: employee === null ? null : employee.nome,
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
  }
}

export default new OverdueRequestController();
