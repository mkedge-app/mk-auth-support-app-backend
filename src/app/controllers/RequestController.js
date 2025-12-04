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
import StaticMapHelper from '../helpers/StaticMapHelper';

class RequestController {
  async index(req, res) {
    try {
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

    const response_object = [];

    for (const [, request] of support_requests.entries()) {
      const { login, chamado, tecnico } = request;

      const response = await Client.findOne({
        where: {
          login,
        },
      });

      // Buscar primeira mensagem para a lista
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

      response_object.push({
        id: request.id,
        visita: format(addHours(request.visita, timeZoneOffset), 'HH:mm'),
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
        cliente_status_online: isConnected ? 'Online' : 'Offline',
        aberto_por: opened_by_name,
        fechado_por: closed_by_name,
      });
    }

    for (const [idx, request] of installation_requests.entries()) {
      const { tecnico, coordenadas, login } = request;

      const employee = await Employee.findOne({
        where: {
          nome: tecnico,
        },
      });

      let latitude = null;
      let longitude = null;

      if (coordenadas) {
        [latitude, longitude] = coordenadas.split(',');
        longitude = parseFloat(longitude.replace(/\s+/, ' '));
      }

      // Verificar se cliente está online
      const isConnected = await ConnectedUsers.findOne({
        where: { login },
      });

      response_object.push({
        id: request.id,
        visita: format(addHours(request.visita, timeZoneOffset), 'HH:mm'),
        nome: request.nome,
        assunto: 'Ativação',
        ip: request.ip,
        plano: request.plano,
        status: request.instalado === 'sim' ? 'fechado' : 'aberto',
        endereco: request.endereco_res,
        numero: request.numero_res,
        bairro: request.bairro_res,
        employee_name: employee === null ? null : employee.nome,
        latitude,
        longitude,
        cliente_status_online: isConnected ? 'Online' : 'Offline',
        aberto_por: null, // Installation requests não têm este campo
        fechado_por: null, // Installation requests não têm este campo
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
    } catch (error) {
      console.error('Erro ao buscar chamados:', error);
      return res.status(500).json({ error: 'Erro ao buscar chamados' });
    }
  }

  async show(req, res) {
    try {
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

      // Buscar TODAS as mensagens do chamado
      const mensagens = await Mensagem.findAll({
        where: {
          chamado: request.chamado,
        },
        order: [['msg_data', 'ASC']],
      });

      const employee = await Employee.findByPk(request.tecnico);

      const timeZoneOffset = new Date().getTimezoneOffset() / 60;

      let latitude = null;
      let longitude = null;

      if (response.coordenadas) {
        [latitude, longitude] = response.coordenadas.split(',');
        latitude = parseFloat(latitude);
        longitude = parseFloat(longitude.replace(/\s+/, ' '));
      }

      // Gerar URL do mapa estático
      const static_map_url = await StaticMapHelper.generateStaticMapUrl(
        latitude,
        longitude
      );

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
        mensagens: mensagens.map(m => ({
          id: m.id,
          texto: m.msg,
          data: m.msg_data,
          atendente: m.atendente,
          tipo: m.tipo,
        })),
        observacoes: response.observacao || null,
        caixa_hermetica: cto ? response.caixa_herm : null,
        employee_name: employee === null ? null : employee.nome,
        latitude,
        longitude,
        static_map_url,
        telefone: response.fone,
        celular: response.celular,
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
    };

    return res.json(obj);
    } catch (error) {
      console.error('Erro ao buscar detalhes do chamado:', error);
      return res.status(500).json({ error: 'Erro ao buscar detalhes do chamado' });
    }
  }

  async update(req, res) {
    try {
      const { id: request_id } = req.params;
      const { request_type, action } = req.body;

    console.log('🔷 [REQUEST_UPDATE] Nova requisição recebida:', {
      request_id,
      request_type,
      action,
      body: req.body,
      user: req.userId || 'N/A'
    });

    let request = null;

    if (request_type === 'Suporte') {
      request = await SupportRequest.findByPk(request_id);
    } else {
      // Colocar a lógica para pegar a request da tabela de Ativação
      request = await InstallationRequest.findByPk(request_id);
    }

    if (!request) {
      console.log('❌ [REQUEST_UPDATE] Chamado não encontrado:', request_id);
      return res.status(400).json({ error: 'This ticket does not exist' });
    }

    console.log('✅ [REQUEST_UPDATE] Chamado encontrado:', {
      chamado: request.chamado,
      status: request.status,
      cliente: request.nome
    });

    let log = null;

    switch (action) {
      case 'update_employee': {
        const { employee_id, madeBy } = req.body;

        // Recuperação do login do novo técnico
        const newEmployee = await Employee.findByPk(employee_id);
        if (!newEmployee) {
          return res.status(404).json({ error: 'Novo técnico não encontrado' });
        }
        
        const { email: new_email } = newEmployee;
        const newUser = await User.findOne({
          where: {
            email: new_email,
          },
        });
        
        if (!newUser) {
          return res.status(404).json({ error: 'Usuário do novo técnico não encontrado' });
        }
        
        const { login: new_login } = newUser;

        // Recuperação do login do técnico que fez a alteração no chamado
        const employee = await Employee.findByPk(madeBy);
        if (!employee) {
          console.error(`❌ Funcionário não encontrado com ID: ${madeBy}`);
          return res.status(404).json({ error: 'Funcionário não encontrado' });
        }
        
        const { email } = employee;
        const user = await User.findOne({
          where: {
            email,
          },
        });
        
        if (!user) {
          console.error(`❌ Usuário não encontrado com email: ${email}`);
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const { login } = user;

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
          
          if (!employee) {
            return res.status(404).json({ error: 'Técnico não encontrado' });
          }

          request.tecnico = employee.nome;
          await request.save();
          break;
        }
      }

      case 'close_request': {
        console.log('🔵 [CLOSE_REQUEST] Iniciando fechamento de chamado:', {
          chamado: request.chamado,
          status_atual: request.status,
          tipo: request_type,
          body: req.body
        });

        if (request.status === 'fechado') {
          console.log('❌ [CLOSE_REQUEST] Chamado já está fechado');
          return res.status(405).json({ error: 'Ticket already closed' });
        }

        if (request_type === 'Suporte') {
          const { closingNote, employee_id, closingDate } = req.body;

          console.log('🔵 [CLOSE_REQUEST] Fechando chamado de suporte:', {
            employee_id,
            closingNote,
            closingDate
          });

          // Busca o usuário na tabela sis_acesso pelo idacesso
          const user = await User.findByPk(employee_id);
          
          if (!user) {
            console.log('❌ [CLOSE_REQUEST] Usuário não encontrado no sis_acesso:', employee_id);
            return res.status(400).json({ error: 'User not found' });
          }
          
          console.log('✅ [CLOSE_REQUEST] Usuário encontrado:', user.login);
          
          // Busca o funcionário na tabela sis_func pelo login (case-insensitive)
          const employee = await Employee.findOne({
            where: {
              [Op.or]: [
                { nome: user.login },
                { nome: user.login.toLowerCase() },
                { nome: user.login.charAt(0).toUpperCase() + user.login.slice(1).toLowerCase() },
                { email: user.email }
              ]
            }
          });

          if (!employee) {
            console.log('❌ [CLOSE_REQUEST] Funcionário não encontrado na sis_func para o login:', user.login);
            console.log('🔍 [CLOSE_REQUEST] Tentou buscar com:', {
              nome: user.login,
              email: user.email
            });
            return res.status(400).json({ error: 'Employee not found' });
          }

          console.log('✅ [CLOSE_REQUEST] Funcionário encontrado:', employee.nome);

          // Request closing
          request.status = 'fechado';
          request.fechamento = closingDate;
          request.motivo_fechar = `fechado por ${employee.nome}: ${closingNote}`;
          
          console.log('🔵 [CLOSE_REQUEST] Salvando chamado:', {
            status: request.status,
            fechamento: request.fechamento,
            motivo_fechar: request.motivo_fechar
          });
          
          await request.save();
          
          console.log('✅ [CLOSE_REQUEST] Chamado fechado com sucesso!');

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
        const employee = await Employee.findByPk(madeBy);
        if (!employee) {
          console.error(`❌ Funcionário não encontrado com ID: ${madeBy}`);
          return res.status(404).json({ error: 'Funcionário não encontrado' });
        }
        
        const { email } = employee;
        const user = await User.findOne({
          where: {
            email,
          },
        });
        
        if (!user) {
          console.error(`❌ Usuário não encontrado com email: ${email}`);
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const { login } = user;

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
        const employee = await Employee.findByPk(madeBy);
        if (!employee) {
          console.error(`❌ Funcionário não encontrado com ID: ${madeBy}`);
          return res.status(404).json({ error: 'Funcionário não encontrado' });
        }
        
        const { email } = employee;
        const user = await User.findOne({
          where: {
            email,
          },
        });
        
        if (!user) {
          console.error(`❌ Usuário não encontrado com email: ${email}`);
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const { login } = user;

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
    } catch (error) {
      console.error('Erro ao atualizar chamado:', error);
      return res.status(500).json({ error: 'Erro ao atualizar chamado' });
    }
  }
}

export default new RequestController();
