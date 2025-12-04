import { Op, literal } from 'sequelize';
import { startOfMonth, endOfMonth } from 'date-fns';
import Client from '../models/Client';
import Invoice from '../models/Invoice';
import SupportRequest from '../models/SupportRequest';
import ConnectedUsers from '../models/ConnectedUsers';

class DashboardController {
  async stats(req, res) {
    try {
      console.log('📊 DashboardController.stats - Início');
      const now = new Date();
      const startMonth = startOfMonth(now);
      const endMonth = endOfMonth(now);

      console.log('📊 Buscando estatísticas...');
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
      ] = await Promise.all([
        // 1. Total de clientes ativos
        Client.count({
          where: {
            cli_ativado: 's',
          },
        }),

        // 2. Clientes cadastrados no mês atual
        Client.count({
          where: {
            cli_ativado: 's',
            [Op.or]: [
              literal(`YEAR(cadastro) = ${now.getFullYear()} AND MONTH(cadastro) = ${now.getMonth() + 1}`),
              literal(`cadastro LIKE '${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}%'`),
              literal(`cadastro LIKE '%/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}%'`),
            ],
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

      openRequests.forEach(item => {
        const prioridade = (item.prioridade || 'normal').toLowerCase();
        const total = parseInt(item.total) || 0;
        
        if (requestsByPriority.hasOwnProperty(prioridade)) {
          requestsByPriority[prioridade] = total;
        }
        requestsByPriority.total += total;
      });

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
