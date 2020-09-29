import { parseISO, format, endOfYear } from 'date-fns';
import { Op } from 'sequelize';

import Request from '../models/Request';
import Client from '../models/Client';
import Mensagem from '../models/Mensagem';
import SystemLog from '../models/SystemLog';
import Employee from '../models/Employee';
import Radacct from '../models/Radacct';

class RequestController {
  async index(req, res) {
    const { date, tecnico: tecnico_id } = req.body;

    let requests = null;
    if (tecnico_id === null) {
      requests = await Request.findAll();
    } else {
      requests = await Request.findAll({
        where: {
          tecnico: tecnico_id,
        },
      });
    }

    // Verifica se exitem chamadas para o técnico informado
    if (!requests) {
      return res
        .status(204)
        .json({ message: 'No support requests for this user!' });
    }

    const givenDateRequests = [];

    // eslint-disable-next-line array-callback-return
    requests.map((item, index) => {
      if (item.visita) {
        const dataBaseTime = format(
          requests[index].visita,
          "yyyy-MM-dd'T'00:00:00"
        );

        const apiTime = format(
          new Date(
            parseISO(date).valueOf() +
              parseISO(date).getTimezoneOffset() * 60000
          ),
          "yyyy-MM-dd'T'00:00:00"
        );

        if (dataBaseTime === apiTime) {
          givenDateRequests.push(requests[index]);
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
      const { login, chamado, tecnico } = givenDateRequests[index];

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

      response_object.push({
        id: givenDateRequests[index].id,
        visita: format(
          new Date(
            givenDateRequests[index].visita.valueOf() +
              givenDateRequests[index].visita.getTimezoneOffset() * 60000
          ),
          'HH:mm'
        ),
        nome: givenDateRequests[index].nome,
        login: response.login,
        senha: response.senha,
        plano: response.plano,
        tipo: response.tipo,
        ip: response.ip,
        status: givenDateRequests[index].status,
        assunto: givenDateRequests[index].assunto,
        endereco: response.endereco_res,
        numero: response.numero_res,
        bairro: response.bairro_res,
        mensagem: msg.msg,
        employee_name: employee === null ? null : employee.nome,
      });

      index -= 1;
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
    const { id: request_id } = req.params;

    const request = await Request.findByPk(request_id);

    // Verifica se exitem chamadas para o técnico informado
    if (!request) {
      return res.status(204).json({ message: 'Request ticket does not exist' });
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
        current_user_connection[0].acctstoptime === null ? 'Online' : 'Offline';
    }

    const obj = {
      id: request.id,
      client_id: response.id,
      chamado: request.chamado,
      visita: format(
        new Date(
          request.visita.valueOf() + request.visita.getTimezoneOffset() * 60000
        ),
        'HH:mm'
      ),
      data_visita: format(
        new Date(
          request.visita.valueOf() + request.visita.getTimezoneOffset() * 60000
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
      caixa_hermetica: response.caixa_herm,
      employee_name: employee === null ? null : employee.nome,
      equipment_status,
    };

    return res.json(obj);
  }

  async update(req, res) {
    const { id: request_id } = req.params;

    const request = await Request.findByPk(request_id);

    if (!request) {
      return res.status(400).json({ error: 'This ticket does not exist' });
    }

    let log = null;
    const { action } = req.body;

    switch (action) {
      case 'update_employee': {
        const { employee_id } = req.body;

        request.tecnico = employee_id;
        await request.save();
        break;
      }

      case 'close_request': {
        if (request.status === 'fechado') {
          return res.status(405).json({ error: 'Ticket already closed' });
        }

        const { closingNote, employee_id } = req.body;

        const employee = await Employee.findByPk(employee_id);

        const formattedDate = format(new Date(), 'dd-MM-yyyy HH:mm:ss');

        // Request closing
        request.status = 'fechado';
        request.fechamento = formattedDate;
        request.motivo_fechar = `fechado por ${employee.nome}: ${closingNote}`;
        await request.save();

        // Saving system log
        const { chamado, nome } = request;
        const { login } = req.body;

        const logDate = format(new Date(), 'dd/MM/yyyy HH:mm:ss');

        log = await SystemLog.create({
          registro: `fechou o chamado ${chamado} de: ${nome}`,
          data: logDate,
          login,
          tipo: 'app',
          operacao: 'OPERNULL',
        });

        break;
      }

      case 'update_visita_time': {
        const new_visita_time = format(
          new Date(
            parseISO(req.body.new_visita_time).valueOf() -
              parseISO(req.body.new_visita_time).getTimezoneOffset() * 60000
          ),
          'HH:mm:ss'
        ).toString();

        const current_date = format(request.visita, 'yyyy-MM-dd').toString();

        const updated_visit = parseISO(`${current_date}T${new_visita_time}`);

        request.visita = updated_visit;

        await request.save();

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

        break;
      }

      default:
        break;
    }

    return res.json(log);
  }
}

export default new RequestController();
