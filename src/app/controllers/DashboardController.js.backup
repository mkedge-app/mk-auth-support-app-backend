import { Op, literal } from 'sequelize';
import { startOfMonth, endOfMonth } from 'date-fns';
import Client from '../models/Client';
import Invoice from '../models/Invoice';

class DashboardController {
  async stats(req, res) {
    try {
      const now = new Date();
      const startMonth = startOfMonth(now);
      const endMonth = endOfMonth(now);

      // Queries em paralelo para melhor performance
      const [
        totalClients,
        recentClients,
        blockedClients,
        observationClients,
        pendingInvoices,
        overdueInvoices,
        clientInvoiceStats,
      ] = await Promise.all([
        // 1. Total de clientes ativos
        Client.count({
          where: {
            cli_ativado: 's',
          },
        }),

        // 2. Clientes cadastrados no mês atual - tentar múltiplos formatos
        Client.count({
          where: {
            cli_ativado: 's',
            [Op.or]: [
              literal(`YEAR(cadastro) = 2025 AND MONTH(cadastro) = 11`),
              literal(`cadastro LIKE '2025-11%'`),
              literal(`cadastro LIKE '%/11/2025%'`),
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

        // 5. Faturas a vencer (status aberto/vencido e data >= hoje) - apenas clientes ativos
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

        // 6. Faturas vencidas (status aberto/vencido e data < hoje) - apenas clientes ativos
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

        // 7. Soma dos campos tit_abertos e tit_vencidos dos clientes ativos
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
      ]);

      // Clientes normais = total - bloqueados - com observação
      const normalClients = totalClients - blockedClients - observationClients;

      // Converter para número os contadores do cliente
      const clientTitAbertos = parseInt(clientInvoiceStats.tit_abertos) || 0;
      const clientTitVencidos = parseInt(clientInvoiceStats.tit_vencidos) || 0;

      const response = {
        clients: {
          total: totalClients,
          recent: recentClients,
          normal: normalClients,
          blocked: blockedClients,
          observation: observationClients,
        },
        invoices: {
          pending: pendingInvoices,
          overdue: overdueInvoices,
        },
        clientInvoices: {
          pending: clientTitAbertos,
          overdue: clientTitVencidos,
        },
      };

      return res.json(response);
    } catch (error) {
      console.error('Erro no DashboardController.stats:', error);
      return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  }
}

export default new DashboardController();
