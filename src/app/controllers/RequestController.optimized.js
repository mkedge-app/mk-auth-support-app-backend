/* eslint-disable no-unused-vars */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable radix */
import { parseISO, format, endOfYear, addHours, subHours } from 'date-fns';
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
import ConnectedUsers from '../models/ConnectedUsers';

class RequestController {
  async index(req, res) {
    const { date, tecnico: tecnico_id, isAdmin } = req.body;
    
    const timeZoneOffset = new Date().getTimezoneOffset() / 60;
    
    const dayStarting = new Date(date);
    const dayEnding = new Date(date);
    dayEnding.setUTCHours(23);
    dayEnding.setUTCMinutes(59);
    dayEnding.setUTCSeconds(59);

    let support_requests = null;
    let installation_requests = null;

    if (isAdmin) {
      support_requests = await SupportRequest.findAll({
        where: { visita: { [Op.between]: [dayStarting, dayEnding] } },
        include: [
          {
            model: Client,
            as: 'cliente',
            attributes: ['id', 'login', 'senha', 'plano', 'tipo', 'ip', 'endereco_res', 'numero_res', 'bairro_res', 'fone', 'celular', 'coordenadas'],
            required: false
          }
        ]
      });

      installation_requests = await InstallationRequest.findAll({
        where: { visita: { [Op.between]: [dayStarting, dayEnding] } },
      });
    } else {
      support_requests = await SupportRequest.findAll({
        where: {
          visita: { [Op.between]: [dayStarting, dayEnding] },
          tecnico: tecnico_id,
        },
        include: [
          {
            model: Client,
            as: 'cliente',
            attributes: ['id', 'login', 'senha', 'plano', 'tipo', 'ip', 'endereco_res', 'numero_res', 'bairro_res', 'fone', 'celular', 'coordenadas'],
            required: false
          }
        ]
      });

      const { nome: employee_name } = await Employee.findByPk(tecnico_id);
      
      installation_requests = await InstallationRequest.findAll({
        where: {
          visita: { [Op.between]: [dayStarting, dayEnding] },
          tecnico: employee_name,
        },
      });
    }

    // Se não existirem chamados de nenhum tipo retorna erro 204
    if (!support_requests && !installation_requests) {
      return res.status(204).json({ message: 'No requests for this user!' });
    }

    // Buscar todos os logins únicos para verificar status online
    const allLogins = [];
    support_requests.forEach(req => {
      if (req.cliente && req.cliente.login) allLogins.push(req.cliente.login);
    });
    installation_requests.forEach(req => {
      if (req.login) allLogins.push(req.login);
    });

    // Buscar status online de todos os clientes de uma vez
    const onlineUsers = await ConnectedUsers.findAll({
      where: {
        login: { [Op.in]: allLogins }
      },
      attributes: ['login']
    });

    const onlineLoginsSet = new Set(onlineUsers.map(u => u.login));

    // Buscar todas as mensagens de uma vez
    const chamados = support_requests.map(r => r.chamado).filter(Boolean);
    const mensagens = await Mensagem.findAll({
      where: {
        chamado: { [Op.in]: chamados }
      }
    });
    const mensagensMap = {};
    mensagens.forEach(msg => {
      mensagensMap[msg.chamado] = msg.msg;
    });

    // Buscar todos os técnicos de uma vez
    const tecnicoIds = [...new Set(support_requests.map(r => r.tecnico).filter(Boolean))];
    const employees = await Employee.findAll({
      where: {
        id: { [Op.in]: tecnicoIds }
      }
    });
    const employeesMap = {};
    employees.forEach(emp => {
      employeesMap[emp.id] = emp.nome;
    });

    const response_object = [];

    // Processar support_requests SEM loop de queries
    for (const request of support_requests) {
      const response = request.cliente;
      const isOnline = response && onlineLoginsSet.has(response.login);

      let latitude = null;
      let longitude = null;
      if (response && response.coordenadas) {
        [latitude, longitude] = response.coordenadas.split(',');
        longitude = parseFloat(longitude.replace(/\s+/, ' '));
      }

      response_object.push({
        id: request.id,
        cliente_id: response ? response.id : null,
        visita: format(addHours(request.visita, timeZoneOffset), 'HH:mm'),
        nome: request.nome,
        login: response ? response.login : null,
        senha: response ? response.senha : null,
        plano: response ? response.plano : null,
        tipo: response ? response.tipo : null,
        ip: response ? response.ip : null,
        status: request.status,
        prioridade: request.prioridade,
        assunto: request.assunto,
        endereco: response ? response.endereco_res : null,
        numero: response ? response.numero_res : null,
        bairro: response ? response.bairro_res : null,
        mensagem: mensagensMap[request.chamado] || null,
        employee_name: employeesMap[request.tecnico] || null,
        cliente_status_online: isOnline ? 'Online' : 'Offline',
        cliente_telefone: response ? response.fone : null,
        cliente_celular: response ? response.celular : null,
        latitude,
        longitude,
      });
    }

    // Buscar técnicos de instalação por nome
    const tecnicoNomes = [...new Set(installation_requests.map(r => r.tecnico).filter(Boolean))];
    const installEmployees = await Employee.findAll({
      where: {
        nome: { [Op.in]: tecnicoNomes }
      }
    });
    const installEmployeesMap = {};
    installEmployees.forEach(emp => {
      installEmployeesMap[emp.nome] = emp.nome;
    });

    // Processar installation_requests
    for (const request of installation_requests) {
      const isOnline = onlineLoginsSet.has(request.login);

      let latitude = null;
      let longitude = null;

      if (request.coordenadas) {
        [latitude, longitude] = request.coordenadas.split(',');
        longitude = parseFloat(longitude.replace(/\s+/, ' '));
      }

      response_object.push({
        id: request.id,
        cliente_id: null,
        visita: format(addHours(request.visita, timeZoneOffset), 'HH:mm'),
        nome: request.nome,
        assunto: 'Ativação',
        ip: request.ip,
        plano: request.plano,
        status: request.instalado === 'sim' ? 'fechado' : 'aberto',
        prioridade: 'normal',
        endereco: request.endereco_res,
        numero: request.numero_res,
        bairro: request.bairro_res,
        employee_name: installEmployeesMap[request.tecnico] || null,
        cliente_status_online: isOnline ? 'Online' : 'Offline',
        cliente_telefone: request.telefone || null,
        cliente_celular: request.celular || null,
        latitude,
        longitude,
      });
    }

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

  // ... resto dos métodos permanecem iguais
  async show(req, res) {
    const { id: request_id, request_type } = req.params;
    
    if (request_type === 'Suporte') {
      const request = await SupportRequest.findByPk(request_id);
      
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
        ssid: response.ssid,
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
        telefone: response.fone,
        celular: response.celular,
      };

      return res.json(obj);
    }

    const request = await InstallationRequest.findByPk(request_id);
    
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
      visitado: request.visitado,
      login: request.login,
      senha: request.senha,
      plano: request.plano,
      tipo: request.tipo,
      ip: request.ip,
      ssid: null,
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

        const { email: new_email } = await Employee.findByPk(employee_id);
        const { login: new_login } = await User.findOne({
          where: {
            email: new_email,
          },
        });

        const { email } = await Employee.findByPk(madeBy);
        const { login } = await User.findOne({
          where: {
            email,
          },
        });

        if (request_type === 'Suporte') {
          request.tecnico = employee_id;
          await request.save();

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
          
          request.status = 'fechado';
          request.fechamento = closingDate;
          request.motivo_fechar = `fechado por ${employee.nome}: ${closingNote}`;
          await request.save();

          break;
        } else {
          const { isVisited, isInstalled, isAvailable } = req.body;
          const formattedDate = format(new Date(), 'dd-MM-yyyy HH:mm:ss');
          
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
        const { email } = await Employee.findByPk(madeBy);
        const { login } = await User.findOne({
          where: {
            email,
          },
        });

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
        const { email } = await Employee.findByPk(madeBy);
        const { login } = await User.findOne({
          where: {
            email,
          },
        });

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
