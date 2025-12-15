import { Op, literal } from 'sequelize';
import { startOfMonth, endOfMonth } from 'date-fns';
import logger from '../../logger';
import Client from '../models/Client';
import Invoice from '../models/Invoice';
import SupportRequest from '../models/SupportRequest';
import ConnectedUsers from '../models/ConnectedUsers';

class DashboardController {
  async stats(req, res) {
    try {
      logger.debug('📊 DashboardController.stats - Início');
      const now = new Date();
      const startMonth = startOfMonth(now);
      const endMonth = endOfMonth(now);

      logger.debug('📊 Buscando estatísticas...');
      // Queries em paralelo para melhor performance
      const [
        totalClients,
        recentClients,
        blockedClients,
        observationClients,
        pendingInvoices,
        overdueInvoices,
        clientInvoiceStats,
        openRequests,
        onlineClients,
        todayRequests,
        overdueRequestsCount,
        ongoingRequests,
        completedRequests,
      ] = await Promise.all([
        // 1. Total de clientes ativos
        Client.count({
          where: {
            cli_ativado: 's',
          },
        }),

        // 2. Clientes cadastrados no mês atual (uso de intervalo para aproveitar índice)
        Client.count({
          where: {
            cli_ativado: 's',
            cadastro: {
              [Op.between]: [startMonth, endMonth],
            },
          },
        }),

        // 3. Clientes bloqueados
        Client.count({
          where: {
            cli_ativado: 's',
            bloqueado: 'sim',
          },
        }),

        // 4. Clientes com observação
        Client.count({
          where: {
            cli_ativado: 's',
            observacao: 'sim',
          },
        }),

        // 5. Faturas a vencer
        Invoice.count({
          where: {
            status: {
              [Op.in]: ['aberto', 'vencido'],
            },
            datavenc: {
              [Op.gte]: now,
            },
            login: {
              [Op.in]: literal("(SELECT login FROM sis_cliente WHERE cli_ativado = 's')"),
            },
          },
        }),

        // 6. Faturas vencidas
        Invoice.count({
          where: {
            status: {
              [Op.in]: ['aberto', 'vencido'],
            },
            datavenc: {
              [Op.lt]: now,
            },
            login: {
              [Op.in]: literal("(SELECT login FROM sis_cliente WHERE cli_ativado = 's')"),
            },
          },
        }),

        // 7. Soma dos títulos dos clientes
        Client.findOne({
          attributes: [
            [literal('SUM(tit_abertos)'), 'tit_abertos'],
            [literal('SUM(tit_vencidos)'), 'tit_vencidos'],
          ],
          where: {
            cli_ativado: 's',
          },
          raw: true,
        }),

        // 8. Chamados abertos agrupados por prioridade
        SupportRequest.findAll({
          attributes: [
            'prioridade',
            [literal('COUNT(*)'), 'total'],
          ],
          where: {
            status: {
              [Op.notIn]: ['Fechado', 'fechado', 'FECHADO'],
            },
          },
          group: ['prioridade'],
          raw: true,
        }),

        // 9. Total de clientes online
        ConnectedUsers.count(),

        // 10. Chamados de hoje
        SupportRequest.count({
          where: {
            visita: {
              [Op.between]: [
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
              ],
            },
          },
        }),

        // 11. Chamados atrasados (visita < hoje E status = aberto)
        SupportRequest.count({
          where: {
            visita: {
              [Op.lt]: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
            },
            status: 'aberto',
          },
        }),

        // 12. Chamados em andamento
        SupportRequest.count({
          where: {
            status: {
              [Op.notIn]: ['aberto', 'fechado', 'Fechado', 'FECHADO'],
            },
          },
        }),

        // 13. Chamados concluídos
        SupportRequest.count({
          where: {
            status: {
              [Op.in]: ['fechado', 'Fechado', 'FECHADO'],
            },
          },
        }),
      ]);

      // Clientes normais = total - bloqueados - com observação
      const normalClients = totalClients - blockedClients - observationClients;
      
      // Converter para número os contadores do cliente
      const clientTitAbertos = parseInt(clientInvoiceStats.tit_abertos) || 0;
      const clientTitVencidos = parseInt(clientInvoiceStats.tit_vencidos) || 0;

      // Processar chamados por prioridade
      const requestsByPriority = {
        urgente: 0,
        alta: 0,
        normal: 0,
        baixa: 0,
        total: 0,
      };

      console.log('📋 Chamados abertos encontrados:', openRequests);
      
      openRequests.forEach(item => {
        const prioridade = (item.prioridade || 'normal').toLowerCase();
        const total = parseInt(item.total) || 0;
        
        if (requestsByPriority.hasOwnProperty(prioridade)) {
          requestsByPriority[prioridade] = total;
        }
        requestsByPriority.total += total;
      });
      
      console.log('📊 Requests by priority:', requestsByPriority);
      console.log('📊 Requests summary:', { today: todayRequests, overdue: overdueRequestsCount, ongoing: ongoingRequests, completed: completedRequests });

      const response = {
        clients: {
          total: totalClients,
          recent: recentClients,
          normal: normalClients,
          blocked: blockedClients,
          observation: observationClients,
          online: onlineClients,
          offline: totalClients - onlineClients,
        },
        invoices: {
          pending: pendingInvoices,
          overdue: overdueInvoices,
        },
        clientInvoices: {
          pending: clientTitAbertos,
          overdue: clientTitVencidos,
        },
        requests: requestsByPriority,
        requestsSummary: {
          today: todayRequests,
          overdue: overdueRequestsCount,
          ongoing: ongoingRequests,
          completed: completedRequests,
        },
      };

      console.log('✅ Dashboard stats carregado com sucesso');
      return res.json(response);
    } catch (error) {
      console.error('❌ Erro no DashboardController.stats:', error);
      console.error('Stack:', error.stack);
      return res.status(500).json({ 
        error: 'Erro ao buscar estatísticas',
        message: error.message 
      });
    }
  }
}

export default new DashboardController();
