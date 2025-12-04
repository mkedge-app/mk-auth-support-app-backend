import { subDays } from 'date-fns';
import { Op } from 'sequelize';

import Notification from '../models/Notification';

class NotificationController {
  async update(req, res) {
    const { action, employee_id } = req.body;

    switch (action) {
      case 'markAsViewed': {
        const { viewed_at } = req.body;

        const not_viewed_notifications = await Notification.findAll({
          where: {
            user: employee_id,
          },
          order: [['created_at', 'DESC']],
        });

        if (!not_viewed_notifications) {
          return res.status(400).json({ message: 'No notification found' });
        }

        const response = [];
        not_viewed_notifications.forEach(async element => {
          if (element.is_viewed === false) {
            element.is_viewed = true;
            element.viewed_at = viewed_at;
          }

          response.push(element);
        });

        not_viewed_notifications.forEach(async element => {
          const notification = await Notification.findByPk(element.id);

          if (notification.is_viewed === false) {
            if (notification) {
              notification.is_viewed = true;
              notification.viewed_at = viewed_at;
              await notification.save();
            }
          }
        });

        return res.json({ notifications: response });
      }

      case 'markAsRead': {
        const { notification_id } = req.body;

        const notification = await Notification.findByPk(notification_id);
        if (notification) {
          notification.is_read = true;
          await notification.save();
        }

        break;
      }

      default:
        break;
    }

    return res.json({ ok: true });
  }

  async show(req, res) {
    const date = subDays(new Date(), 3);

    // eslint-disable-next-line radix
    const employee_id = parseInt(req.params.employee_id);

    const notifications = await Notification.findAll({
      where: {
        user: employee_id,
        created_at: {
          [Op.gte]: date,
        },
      },
      order: [['created_at', 'DESC']],
    });

    return res.json({ notifications });
  }

  // Admin - Listar todas as notificações
  async index(req, res) {
    try {
      const notifications = await Notification.findAll({
        order: [['created_at', 'DESC']],
        limit: 100
      });

      return res.json(notifications);
    } catch (error) {
      console.error('Erro ao listar notificações:', error);
      return res.status(500).json({ error: 'Erro ao listar notificações' });
    }
  }

  // Admin - Criar/enviar notificação
  async create(req, res) {
    try {
      const { title, message, recipients, specificClient } = req.body;

      if (!title || !message) {
        return res.status(400).json({ error: 'Título e mensagem são obrigatórios' });
      }

      // Determinar destinatários
      let targetUsers = [];
      if (recipients === 'all') {
        // Aqui você pode buscar todos os usuários do sistema
        // Por enquanto, criamos uma notificação genérica
        targetUsers = ['system'];
      } else if (recipients === 'active') {
        // Buscar apenas usuários ativos
        targetUsers = ['active_users'];
      } else if (recipients === 'specific' && specificClient) {
        targetUsers = [specificClient];
      }

      // Criar notificação
      const notification = await Notification.create({
        header: title,
        content: message,
        user: targetUsers[0] || 'system',
        recipients: JSON.stringify(targetUsers),
        created_at: new Date(),
        is_viewed: false
      });

      return res.json({ 
        success: true, 
        message: 'Notificação enviada com sucesso',
        notification 
      });

    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      return res.status(500).json({ error: 'Erro ao criar notificação' });
    }
  }
}

export default new NotificationController();
