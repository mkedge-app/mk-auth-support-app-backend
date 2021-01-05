/* eslint-disable radix */
import { parseISO, format, endOfYear, addHours } from 'date-fns';
import { Op } from 'sequelize';

import CTO from '../models/CTO';
import User from '../models/User';
import Client from '../models/Client';
import Radacct from '../models/Radacct';
import Mensagem from '../models/Mensagem';
import Employee from '../models/Employee';
import SystemLog from '../models/SystemLog';
import SupportRequest from '../models/SupportRequest';
import InstallationRequest from '../models/InstallationRequest';

class RequestController {
  async index(req, res) {
    const { date, tecnico: tecnico_id, isAdmin } = req.body;

    const { nome: employee_name } = await Employee.findByPk(tecnico_id);

    let support_requests = null;
    let installation_requests = null;

    if (isAdmin) {
      support_requests = await SupportRequest.findAll();
      installation_requests = await InstallationRequest.findAll();
    } else {
      support_requests = await SupportRequest.findAll({
        where: {
          tecnico: tecnico_id,
        },
      });

      installation_requests = await InstallationRequest.findAll({
        where: {
          tecnico: employee_name,
        },
      });
    }

    // Verifica se exitem chamadas para o técnico informado
    if (!support_requests && !installation_requests) {
      return res.status(204).json({ message: 'No requests for this user!' });
    }

    const givenDateRequests = [];

    const apiTime = format(
      new Date(
        parseISO(date).valueOf() + parseISO(date).getTimezoneOffset() * 60000
      ),
      "yyyy-MM-dd'T'00:00:00"
    );

    // eslint-disable-next-line array-callback-return
    support_requests.map((item, index) => {
      if (item.visita) {
        const dataBaseTime = format(
          support_requests[index].visita,
          "yyyy-MM-dd'T'00:00:00"
        );

        if (dataBaseTime === apiTime) {
          givenDateRequests.push(support_requests[index]);
        }
      }
    });

    // eslint-disable-next-line array-callback-return
    installation_requests.map((item, index) => {
      if (item.visita) {
        const dataBaseTime = format(
          installation_requests[index].visita,
          "yyyy-MM-dd'T'00:00:00"
        );

        if (dataBaseTime === apiTime) {
          givenDateRequests.push(installation_requests[index]);
        }
      }
    });

    // Verifica se existem visitas agendadas para a data informada
    if (givenDateRequests.length < 1) {
      return res
        .status(204)
        .json({ error: 'No support requests fot this date' });
    }

    let index = givenDateRequests.length - 1;

    const response_object = [];

    do {
      const { login, chamado, tecnico, tipo, coordenadas } = givenDateRequests[
        index
      ];
      if (!tipo) {
        // eslint-disable-next-line no-await-in-loop
        const response = await Client.findOne({
          where: {
            login,
          },
        });

        // eslint-disable-next-line no-await-in-loop
        const msg = await Mensagem.findOne({
          where: {
            chamado,
          },
        });

        // eslint-disable-next-line no-await-in-loop
        const employee = await Employee.findByPk(tecnico);

        const timeZoneOffset = new Date().getTimezoneOffset() / 60;

        response_object.push({
          id: givenDateRequests[index].id,
          visita: format(
            addHours(givenDateRequests[index].visita, timeZoneOffset),
            'HH:mm'
          ),
          nome: givenDateRequests[index].nome,
          login: response.login,
          senha: response.senha,
          plano: response.plano,
          tipo: response.tipo,
          ip: response.ip,
          status: givenDateRequests[index].status,
          prioridade: givenDateRequests[index].prioridade,
          assunto: givenDateRequests[index].assunto,
          endereco: response.endereco_res,
          numero: response.numero_res,
          bairro: response.bairro_res,
          mensagem: msg.msg,
          employee_name: employee === null ? null : employee.nome,
        });

        index -= 1;
      } else {
        // eslint-disable-next-line no-await-in-loop
        const employee = await Employee.findOne({
          where: {
            nome: tecnico,
          },
        });

        const timeZoneOffset = new Date().getTimezoneOffset() / 60;

        let latitude = null;
        let longitude = null;

        if (coordenadas) {
          [latitude, longitude] = coordenadas.split(',');
          longitude = parseFloat(longitude.replace(/\s+/, ' '));
        }

        response_object.push({
          id: givenDateRequests[index].id,
          visita: format(
            addHours(givenDateRequests[index].visita, timeZoneOffset),
            'HH:mm'
          ),
          nome: givenDateRequests[index].nome,
          assunto: 'Ativação',
          ip: givenDateRequests[index].ip,
          plano: givenDateRequests[index].plano,
          status:
            givenDateRequests[index].instalado === 'sim' ? 'fechado' : 'aberto',
          endereco: givenDateRequests[index].endereco_res,
          numero: givenDateRequests[index].numero_res,
          bairro: givenDateRequests[index].bairro_res,
          employee_name: employee === null ? null : employee.nome,
          latitude,
          longitude,
        });

        index -= 1;
      }
    } while (index >= 0);

    // Organizando array em ordem crescente de visita
    response_object.sort((a, b) => {
      const keyA = a.visita;
      const keyB = b.visita;

      if (keyA < keyB) return -1;
      if (keyA > keyB) return 1;
      return 0;
    });

    return res.json(response_object);
  }

  async show(req, res) {
    const { id: request_id, request_type } = req.params;

    if (request_type === 'Suporte') {
      const request = await SupportRequest.findByPk(request_id);

      // Verifica se exitem chamadas para o técnico informado
      if (!request) {
        return res
          .status(204)
          .json({ message: 'Request ticket does not exist' });
      }

      const response = await Client.findOne({
        where: {
          login: request.login,
        },
      });

      const msg = await Mensagem.findOne({
        where: {
          chamado: request.chamado,
        },
      });

      const employee = await Employee.findByPk(request.tecnico);

      const current_user_connection = await Radacct.findAll({
        where: {
          username: request.login,
          acctstarttime: {
            [Op.lte]: endOfYear(new Date()),
          },
        },
        limit: 1,
        order: [['acctstarttime', 'DESC']],
        attributes: ['acctstarttime', 'acctstoptime'],
      });

      let equipment_status = 'Offline';
      if (current_user_connection.length !== 0) {
        equipment_status =
          current_user_connection[0].acctstoptime === null
            ? 'Online'
            : 'Offline';
      }

      const timeZoneOffset = new Date().getTimezoneOffset() / 60;

      let latitude = null;
      let longitude = null;

      if (response.coordenadas) {
        [latitude, longitude] = response.coordenadas.split(',');
        longitude = parseFloat(longitude.replace(/\s+/, ' '));
      }

      // Verifica se a caixa hermética do cliente é uma caixa cadastrada na MP_Caixas
      const cto = await CTO.findOne({
        where: {
          nome: response.caixa_herm,
        },
      });

      const obj = {
        id: request.id,
        client_id: response.id,
        chamado: request.chamado,
        visita: format(addHours(request.visita, timeZoneOffset), 'HH:mm'),
        data_visita: format(
          new Date(
            request.visita.valueOf() +
              request.visita.getTimezoneOffset() * 60000
          ),
          'dd/MM/yyyy'
        ),
        nome: request.nome,
        fechamento: request.fechamento,
        motivo_fechamento: request.motivo_fechar,
        login: response.login,
        senha: response.senha,
        plano: response.plano,
        tipo: response.tipo,
        ip: response.ip,
        status: request.status,
        assunto: request.assunto,
        endereco: response.endereco_res,
        numero: response.numero_res,
        bairro: response.bairro_res,
        equipamento: response.equipamento,
        coordenadas: response.coordenadas,
        mensagem: msg.msg,
        caixa_hermetica: cto ? response.caixa_herm : null,
        employee_name: employee === null ? null : employee.nome,
        equipment_status,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      };

      return res.json(obj);
    }

    const request = await InstallationRequest.findByPk(request_id);

    // Verifica se exitem chamadas para o técnico informado
    if (!request) {
      return res.status(204).json({ message: 'Request ticket does not exist' });
    }

    const client = await Client.findOne({
      where: {
        login: request.login,
      },
    });

    const employee = await Employee.findOne({
      where: {
        nome: request.tecnico,
      },
    });

    const current_user_connection = await Radacct.findAll({
      where: {
        username: request.login,
        acctstarttime: {
          [Op.lte]: endOfYear(new Date()),
        },
      },
      limit: 1,
      order: [['acctstarttime', 'DESC']],
      attributes: ['acctstarttime', 'acctstoptime'],
    });

    let equipment_status = 'Offline';
    if (current_user_connection.length !== 0) {
      equipment_status =
        current_user_connection[0].acctstoptime === null ? 'Online' : 'Offline';
    }

    const timeZoneOffset = new Date().getTimezoneOffset() / 60;

    let latitude = null;
    let longitude = null;

    if (request.coordenadas) {
      [latitude, longitude] = request.coordenadas.split(',');
      longitude = parseFloat(longitude.replace(/\s+/, ' '));
    }

    const obj = {
      id: request.id,
      chamado: request.chamado,
      client_id: client ? client.id : null,
      visita: format(addHours(request.visita, timeZoneOffset), 'HH:mm'),
      data_visita: format(
        new Date(
          request.visita.valueOf() + request.visita.getTimezoneOffset() * 60000
        ),
        'dd/MM/yyyy'
      ),
      nome: request.nome,
      fechamento: request.fechamento,
      motivo_fechamento: request.motivo_fechar,
      visitado: request.visitado,
      login: request.login,
      senha: request.senha,
      plano: request.plano,
      tipo: request.tipo,
      ip: request.ip,
      status: request.status,
      instalado: request.instalado,
      assunto: request_type,
      endereco: request.endereco_res,
      numero: request.numero_res,
      bairro: request.bairro_res,
      equipamento: request.equipamento,
      coordenadas: request.coordenadas,
      latitude,
      longitude,
      mensagem: request.obs,
      caixa_hermetica: null,
      employee_name: employee === null ? null : employee.nome,
      telefone: request.telefone,
      celular: request.celular,
      equipment_status,
    };

    return res.json(obj);
  }

  async update(req, res) {
    const { id: request_id } = req.params;
    const { request_type } = req.body;

    let request = null;

    if (request_type === 'Suporte') {
      request = await SupportRequest.findByPk(request_id);
    } else {
      // Colocar a lógica para pegar a request da tabela de Ativação
      request = await InstallationRequest.findByPk(request_id);
    }

    if (!request) {
      return res.status(400).json({ error: 'This ticket does not exist' });
    }

    let log = null;
    const { action } = req.body;

    switch (action) {
      case 'update_employee': {
        const { employee_id, madeBy } = req.body;

        // Recuperação do login do novo técnico
        const { email: new_email } = await Employee.findByPk(employee_id);
        const { login: new_login } = await User.findOne({
          where: {
            email: new_email,
          },
        });

        // Recuperação do login do técnico que fez a alteração no chamado
        const { email } = await Employee.findByPk(madeBy);
        const { login } = await User.findOne({
          where: {
            email,
          },
        });

        if (request_type === 'Suporte') {
          request.tecnico = employee_id;
          await request.save();

          // Criação de log da operação
          const { chamado } = request;

          const logDate = format(new Date(), 'dd/MM/yyyy HH:mm:ss');

          log = await SystemLog.create({
            registro: `assinalou o chamado ${chamado} para ${new_login} via MK-Edge`,
            data: logDate,
            login,
            tipo: 'app',
            operacao: 'OPERNULL',
          });

          break;
        } else {
          const employee = await Employee.findByPk(employee_id);

          request.tecnico = employee.nome;
          await request.save();
          break;
        }
      }

      case 'close_request': {
        if (request.status === 'fechado') {
          return res.status(405).json({ error: 'Ticket already closed' });
        }

        if (request_type === 'Suporte') {
          const { closingNote, employee_id, closingDate } = req.body;

          const employee = await Employee.findByPk(employee_id);

          // Request closing
          request.status = 'fechado';
          request.fechamento = closingDate;
          request.motivo_fechar = `fechado por ${employee.nome}: ${closingNote}`;
          await request.save();

          // // Saving system log
          // const { chamado, nome } = request;
          // const { login } = req.body;

          // const logDate = format(new Date(), 'dd/MM/yyyy HH:mm:ss');

          // log = await SystemLog.create({
          //   registro: `fechou o chamado ${chamado} de: ${nome}`,
          //   data: logDate,
          //   login,
          //   tipo: 'app',
          //   operacao: 'OPERNULL',
          // });

          break;
        } else {
          const { isVisited, isInstalled, isAvailable } = req.body;

          const formattedDate = format(new Date(), 'dd-MM-yyyy HH:mm:ss');

          // Request closing
          request.fechamento = formattedDate;
          request.datainst = formattedDate;
          request.visitado = isVisited ? 'sim' : 'nao';
          request.instalado = isInstalled ? 'sim' : 'nao';
          request.disp = isAvailable ? 'sim' : 'nao';

          await request.save();

          break;
        }
      }

      case 'update_visita_time': {
        const new_visita_time = format(
          parseISO(req.body.new_visita_time),
          'HH:mm:ss'
        ).toString();

        const current_date = format(request.visita, 'yyyy-MM-dd').toString();

        const updated_visit = `${current_date}T${new_visita_time}`;

        request.visita = updated_visit;

        await request.save();

        const { madeBy } = req.body;

        // Recuperação do login do técnico que fez a alteração no chamado
        const { email } = await Employee.findByPk(madeBy);
        const { login } = await User.findOne({
          where: {
            email,
          },
        });

        // Criação de log da operação
        const { chamado } = request;

        const logDate = format(new Date(), 'dd/MM/yyyy HH:mm:ss');

        log = await SystemLog.create({
          registro: `alterou a hora de visita do chamado ${chamado} para ${new_visita_time} via MK-Edge`,
          data: logDate,
          login,
          tipo: 'app',
          operacao: 'OPERNULL',
        });

        break;
      }

      case 'update_visita_date': {
        const new_visita_date = format(
          parseISO(req.body.new_visita_date),
          'yyyy-MM-dd'
        ).toString();

        const current_time = format(request.visita, 'HH:mm:ss').toString();

        const updated_visit = parseISO(`${new_visita_date}T${current_time}`);

        request.visita = updated_visit;

        await request.save();

        const { madeBy } = req.body;

        // Recuperação do login do técnico que fez a alteração no chamado
        const { email } = await Employee.findByPk(madeBy);
        const { login } = await User.findOne({
          where: {
            email,
          },
        });

        // Criação de log da operação
        const { chamado } = request;

        const logDate = format(new Date(), 'dd/MM/yyyy HH:mm:ss');

        const formatted_new_visita_date = format(
          parseISO(new_visita_date),
          'dd/MM/yyyy'
        );

        log = await SystemLog.create({
          registro: `alterou a data de visita do chamado ${chamado} para ${formatted_new_visita_date} via MK-Edge`,
          data: logDate,
          login,
          tipo: 'app',
          operacao: 'OPERNULL',
        });

        break;
      }

      default:
        break;
    }

    return res.json(log);
  }
}

export default new RequestController();
