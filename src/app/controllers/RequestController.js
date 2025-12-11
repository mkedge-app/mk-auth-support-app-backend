/* eslint-disable no-unused-vars */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable radix */
import { parseISO, format, endOfYear, addHours, subHours } from 'date-fns';
import { Op } from 'sequelize';
import { randomUUID } from 'crypto';

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
import SisOpcao from '../models/SisOpcao';

class RequestController {
  async index(req, res) {
    try {
      const { date, tecnico: tecnico_id, isAdmin, summaryOnly } = req.body;

    console.log('📋 RequestController.index - Params:', { date, tecnico_id, isAdmin, summaryOnly });

    // Se summaryOnly=true, retorna apenas contadores por status
    if (summaryOnly) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [todayCount, overdueCount, ongoingCount, completedCount] = await Promise.all([
        // Chamados de hoje (visita = hoje)
        SupportRequest.count({
          where: {
            visita: { [Op.between]: [today, tomorrow] },
            ...(isAdmin ? {} : { tecnico: tecnico_id })
          }
        }),
        // Chamados atrasados (visita < hoje E status aberto)
        SupportRequest.count({
          where: {
            visita: { [Op.lt]: today },
            status: 'aberto',
            ...(isAdmin ? {} : { tecnico: tecnico_id })
          }
        }),
        // Chamados em andamento (status diferente de aberto e fechado)
        SupportRequest.count({
          where: {
            status: { [Op.notIn]: ['aberto', 'fechado', 'Fechado', 'FECHADO'] },
            ...(isAdmin ? {} : { tecnico: tecnico_id })
          }
        }),
        // Chamados concluídos
        SupportRequest.count({
          where: {
            status: { [Op.in]: ['fechado', 'Fechado', 'FECHADO', 'concluido', 'Concluído', 'CONCLUIDO'] },
            ...(isAdmin ? {} : { tecnico: tecnico_id })
          }
        })
      ]);

      console.log('📊 Summary counts:', { todayCount, overdueCount, ongoingCount, completedCount });

      return res.json({
        today: todayCount,
        overdue: overdueCount,
        ongoing: ongoingCount,
        completed: completedCount
      });
    }

    const timeZoneOffset = new Date().getTimezoneOffset() / 60;

    const dayStarting = new Date(date);

    const dayEnding = new Date(date);
    dayEnding.setUTCHours(23);
    dayEnding.setUTCMinutes(59);
    dayEnding.setUTCSeconds(59);

    console.log('📅 Date range:', { dayStarting, dayEnding });

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

    console.log('📋 Found', support_requests?.length || 0, 'support requests and', installation_requests?.length || 0, 'installation requests');

    // Se não existirem chamados de nenhum tipo retorna vazio
    if ((!support_requests || support_requests.length === 0) && 
        (!installation_requests || installation_requests.length === 0)) {
      return res.json([]);
    }

    const response_object = [];

    // Processar support_requests apenas se existir e tiver itens
    if (support_requests && support_requests.length > 0) {
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
    }

    // Processar installation_requests apenas se existir e tiver itens
    if (installation_requests && installation_requests.length > 0) {
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
      console.error('❌ Erro ao buscar chamados:', error);
      console.error('❌ Stack:', error.stack);
      console.error('❌ Message:', error.message);
      return res.status(500).json({ error: 'Erro ao buscar chamados', details: error.message });
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

      case 'update_title': {
        const { new_title, madeBy } = req.body;

        if (!new_title || !new_title.trim()) {
          return res.status(400).json({ error: 'Título é obrigatório' });
        }

        const oldTitle = request.assunto;
        request.assunto = new_title.trim();
        await request.save();

        // Recuperação do login do técnico que fez a alteração
        const employee = await Employee.findByPk(madeBy);
        if (!employee) {
          console.error(`❌ Funcionário não encontrado com ID: ${madeBy}`);
          return res.status(404).json({ error: 'Funcionário não encontrado' });
        }
        
        const { email } = employee;
        const user = await User.findOne({
          where: { email },
        });
        
        if (!user) {
          console.error(`❌ Usuário não encontrado com email: ${email}`);
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const { login } = user;
        const { chamado } = request;
        const logDate = format(new Date(), 'dd/MM/yyyy HH:mm:ss');

        log = await SystemLog.create({
          registro: `alterou o título do chamado ${chamado} de "${oldTitle}" para "${new_title}" via MK-Edge`,
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

  async stats(req, res) {
    try {
      console.log('📊 RequestController.stats - Iniciando');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [todayCount, completedCount, ongoingCount, overdueCount] = await Promise.all([
        // Chamados de hoje (visita = hoje)
        SupportRequest.count({
          where: {
            visita: { [Op.between]: [today, tomorrow] },
          }
        }),
        // Chamados concluídos
        SupportRequest.count({
          where: {
            status: { [Op.in]: ['fechado', 'Fechado', 'FECHADO'] },
          }
        }),
        // Chamados em andamento (status diferente de aberto e fechado)
        SupportRequest.count({
          where: {
            status: { [Op.notIn]: ['aberto', 'fechado', 'Fechado', 'FECHADO'] },
          }
        }),
        // Chamados atrasados (visita < hoje E status aberto)
        SupportRequest.count({
          where: {
            visita: { [Op.lt]: today },
            status: 'aberto',
          }
        }),
      ]);

      const stats = {
        hoje: todayCount,
        concluidos: completedCount,
        emAndamento: ongoingCount,
        atrasados: overdueCount,
      };

      console.log('📊 Stats calculados:', stats);

      return res.json(stats);
    } catch (error) {
      console.error('❌ Erro ao buscar stats:', error);
      return res.status(500).json({ 
        error: 'Erro ao buscar estatísticas',
        hoje: 0,
        concluidos: 0,
        emAndamento: 0,
        atrasados: 0,
      });
    }
  }

  async store(req, res) {
    try {
      console.log('🆕 RequestController.store - Criando novo chamado');
      console.log('📦 Payload recebido:', req.body);
      console.log('👤 UserId do token (req.idacesso):', req.idacesso);

      const {
        client_id,
        id_cliente,
        uuid_cliente,
        assunto,
        mensagem,
        msg,
        tecnico,
        employee_id,
        prioridade,
        visita_data,
        visita_hora,
        data_visita,
        visita,
        ramal,
        atendente,
        login_atend,
        status = 'aberto'
      } = req.body;

      // Validações básicas
      if (!assunto || !assunto.trim()) {
        return res.status(400).json({ error: 'O assunto é obrigatório' });
      }

      // Determinar o login do cliente (aceita diferentes formatos)
      const clientLogin = client_id || id_cliente || uuid_cliente;
      if (!clientLogin) {
        return res.status(400).json({ error: 'ID do cliente é obrigatório (client_id, id_cliente ou uuid_cliente)' });
      }

      // Buscar dados do cliente
      const client = await Client.findOne({ where: { login: clientLogin } });
      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      // Determinar técnico (aceita employee_id ou tecnico)
      const tecnicoId = employee_id || tecnico;

      // Validar se técnico existe
      if (tecnicoId) {
        const employee = await Employee.findByPk(tecnicoId);
        if (!employee) {
          return res.status(404).json({ error: 'Técnico não encontrado' });
        }
      }

      // Processar data/hora da visita
      let visitaDateTime = null;
      if (visita) {
        visitaDateTime = new Date(visita);
      } else if (data_visita || visita_data) {
        const dataStr = data_visita || visita_data;
        const horaStr = visita_hora || '00:00';
        
        // O app envia horário local de Manaus (UTC-4)
        // O servidor está em UTC, então precisa subtrair 4 horas
        const localDateTime = `${dataStr}T${horaStr}:00-04:00`; // Especifica timezone -04:00
        visitaDateTime = new Date(localDateTime);
        
        console.log('📅 Data/hora da visita:', {
          entrada: { data: dataStr, hora: horaStr },
          comTimezone: localDateTime,
          interpretada: visitaDateTime.toISOString(),
          verificacao: visitaDateTime.toLocaleString('pt-BR', { timeZone: 'America/Manaus' })
        });
      }

      // Gerar número do chamado (formato: DDMMYYHHMMSS + 2 dígitos de milissegundos)
      const now = new Date();
      const ms = Math.floor(now.getMilliseconds() / 10); // 0-99
      const chamadoNumber = format(now, 'ddMMyyHHmmss') + ms.toString().padStart(2, '0');

      // Gerar UUID único para o chamado usando crypto nativo
      const uuidSuporte = randomUUID();

      // Buscar nome do atendente
      let atendenteNome = atendente;
      let atendenteLogin = login_atend;
      
      // Se não foi fornecido, buscar do usuário logado (do token JWT)
      if (!atendenteNome || !atendenteLogin) {
        const userId = req.idacesso; // Vem do middleware de autenticação
        if (userId) {
          const userLogado = await User.findByPk(userId);
          if (userLogado) {
            atendenteNome = atendenteNome || userLogado.nome;
            atendenteLogin = atendenteLogin || userLogado.login;
          }
        }
      }
      
      // Se foi fornecido login_atend mas não o nome, buscar o nome
      if (atendenteLogin && !atendenteNome) {
        const userAtendente = await User.findOne({ where: { login: atendenteLogin } });
        if (userAtendente) {
          atendenteNome = userAtendente.nome;
        }
      }

      console.log('👤 Atendente:', { nome: atendenteNome, login: atendenteLogin, userId: req.idacesso });

      // Criar chamado
      const newRequest = await SupportRequest.create({
        login: client.login,
        nome: client.nome,
        chamado: chamadoNumber,
        uuid_suporte: uuidSuporte,
        assunto: assunto.trim(),
        tecnico: tecnicoId || 0,
        prioridade: prioridade || 'normal',
        status: status || 'aberto',
        visita: visitaDateTime,
        abertura: now,
        atendente: atendenteNome || 'Sistema',
        login_atend: atendenteLogin || null,
        email: client.email || null,
        ramal: ramal || client.ramal || null,
        // telefone: client.celular || client.fone || null, // Campo não existe ainda
        // ramal_cto: ramal || client.caixa_herm || client.ssid || null, // Campo não existe ainda
      });

      console.log('✅ Chamado criado:', newRequest.id);

      // Criar mensagem inicial se fornecida
      const messageText = msg || mensagem;
      if (messageText && messageText.trim()) {
        await Mensagem.create({
          chamado: chamadoNumber,
          msg: messageText.trim(),
          atendente: atendente || ramal || 'Sistema',
          msg_data: now,
          login: client.login,
          tipo: 'T', // Tipo técnico
        });
        console.log('💬 Mensagem inicial criada');
      }

      // Buscar chamado completo com dados do cliente e técnico
      const employee = tecnicoId ? await Employee.findByPk(tecnicoId) : null;
      
      const response = {
        id: newRequest.id,
        chamado: newRequest.chamado,
        login: newRequest.login,
        nome: client.nome,
        assunto: newRequest.assunto,
        status: newRequest.status,
        prioridade: newRequest.prioridade,
        visita: newRequest.visita,
        tecnico: newRequest.tecnico,
        employee_name: employee ? employee.nome : null,
        atendente: newRequest.atendente,
        endereco: client.endereco_res,
        numero: client.numero_res,
        bairro: client.bairro_res,
        // telefone: client.fone || null, // Campo não existe ainda
        celular: client.celular || null,
        created_at: now,
      };

      console.log('✅ Chamado criado com sucesso:', response.chamado);

      return res.status(201).json(response);
    } catch (error) {
      console.error('❌ Erro ao criar chamado:', error);
      return res.status(500).json({ 
        error: 'Erro ao criar chamado',
        details: error.message 
      });
    }
  }

  // Retorna dados pré-preenchidos para formulário de abertura de chamado
  async getFormData(req, res) {
    try {
      const { client_id } = req.params;

      console.log('📋 RequestController.getFormData - Cliente:', client_id);

      // Buscar dados do cliente
      const client = await Client.findOne({ where: { login: client_id } });
      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      // Buscar lista de técnicos
      const technicians = await Employee.findAll({
        attributes: ['id', 'nome'],
        order: [['nome', 'ASC']]
      });

      // Buscar assuntos do banco de dados
      let assuntos = [];
      try {
        console.log('🔍 Buscando assuntos...');
        
        // Primeiro tenta buscar de sis_opcao
        const assuntosOpcao = await SisOpcao.findOne({
          where: { nome: 'assunto_suporte' }
        });
        
        console.log('📋 sis_opcao encontrado:', assuntosOpcao ? 'SIM' : 'NÃO');
        
        if (assuntosOpcao && assuntosOpcao.valor) {
          // Os assuntos estão separados por vírgula ou quebra de linha
          assuntos = assuntosOpcao.valor
            .split(/[,\n]+/)
            .map(a => a.trim())
            .filter(a => a.length > 0);
          console.log('✅ Assuntos de sis_opcao:', assuntos.length);
        }
        
        // Se não encontrou em sis_opcao, buscar assuntos únicos já usados em sis_suporte (últimos 3 meses)
        if (assuntos.length === 0) {
          console.log('🔍 Buscando assuntos DISTINCT de sis_suporte (últimos 3 meses)...');
          
          // Data de 3 meses atrás
          const treseMesesAtras = new Date();
          treseMesesAtras.setMonth(treseMesesAtras.getMonth() - 3);
          
          const assuntosUsados = await SupportRequest.findAll({
            attributes: [[SupportRequest.sequelize.fn('DISTINCT', SupportRequest.sequelize.col('assunto')), 'assunto']],
            where: {
              assunto: { [Op.ne]: null },
              abertura: { [Op.gte]: treseMesesAtras }
            },
            order: [['assunto', 'ASC']],
            raw: true
          });
          
          console.log('📊 Assuntos encontrados em sis_suporte (últimos 3 meses):', assuntosUsados.length);
          
          assuntos = assuntosUsados
            .map(a => a.assunto)
            .filter(a => a && a.trim().length > 0);
            
          console.log('✅ Assuntos únicos:', assuntos.length);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar assuntos:', error.message);
      }
      
      // Se ainda não encontrou, usar lista padrão
      if (assuntos.length === 0) {
        console.log('⚠️ Usando lista padrão de assuntos');
        assuntos = [
          'Financeiro',
          'Sem internet',
          'Lentidão',
          'Instalação',
          'Manutenção',
          'Mudança de endereço',
          'Cancelamento',
          'Retirada de equipamento',
          'Reinstalação',
          'Troca de equipamento',
          'Upgrade de plano',
          'Downgrade de plano',
          'Problema no equipamento',
          'Configuração WiFi',
          'Suporte técnico',
          'Outros'
        ];
      }

      // Gerar número do chamado (formato: DDMMYYHHMMSS + 2 dígitos de milissegundos)
      const now = new Date();
      const ms = Math.floor(now.getMilliseconds() / 10); // 0-99
      const chamadoNumber = format(now, 'ddMMyyHHmmss') + ms.toString().padStart(2, '0');
      
      // Data/hora atual formatada
      const dataAbertura = format(now, 'dd/MM/yy HH:mm:ss');
      
      // Sugerir data de visita (3 dias úteis à frente)
      const visitaSugerida = new Date(now);
      visitaSugerida.setDate(visitaSugerida.getDate() + 3);
      const dataVisita = format(visitaSugerida, 'yyyy-MM-dd');
      const horaVisita = format(now, 'HH:mm');

      // Prioridades
      const prioridades = [
        { value: 'baixa', label: 'Baixa' },
        { value: 'normal', label: 'Média' },
        { value: 'alta', label: 'Alta' },
        { value: 'urgente', label: 'Urgente' }
      ];

      return res.json({
        // Dados do cliente
        cliente: {
          id: client.id,
          login: client.login,
          nome: client.nome,
          telefone: client.fone,
          celular: client.celular,
          endereco: `${client.endereco_res}, ${client.numero_res}${client.complemento_res ? ' - ' + client.complemento_res : ''}`,
          bairro: client.bairro_res,
          ramal: client.caixa_herm || client.ssid || 'Não informado',
          plano: client.plano,
        },
        
        // Dados do chamado
        chamado: {
          numero: chamadoNumber,
          data_abertura: dataAbertura,
          data_abertura_iso: now.toISOString(),
        },
        
        // Valores sugeridos
        sugestoes: {
          visita_data: dataVisita,
          visita_hora: horaVisita,
          prioridade: 'normal',
        },
        
        // Listas para selects
        opcoes: {
          tecnicos: technicians.map(t => ({
            value: t.id,
            label: t.nome
          })),
          assuntos: assuntos,
          prioridades: prioridades
        }
      });
    } catch (error) {
      console.error('❌ Erro ao buscar dados do formulário:', error);
      return res.status(500).json({ 
        error: 'Erro ao buscar dados do formulário',
        details: error.message 
      });
    }
  }
}

export default new RequestController();
