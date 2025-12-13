import NotificationLog from '../schemas/NotificationLog';
import MessageTemplate from '../schemas/MessageTemplate';

class NotificationLogController {
  // Listar histórico com filtros
  async index(req, res) {
    try {
      const { template_type, status, channel, page = 1, limit = 50 } = req.query;
      
      const filter = {};
      if (template_type) filter.template_type = template_type;
      if (status) filter.status = status;
      if (channel) filter.channel = channel;
      
      const skip = (page - 1) * limit;
      
      const [notifications, total] = await Promise.all([
        NotificationLog.find(filter)
          .populate('tenant_id', 'nome_fantasia')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        NotificationLog.countDocuments(filter)
      ]);
      
      // Estatísticas
      const stats = await NotificationLog.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      const statsMap = {
        sent: 0,
        pending: 0,
        failed: 0
      };
      
      stats.forEach(stat => {
        statsMap[stat._id] = stat.count;
      });
      
      return res.json({
        notifications,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        },
        stats: statsMap
      });
      
    } catch (error) {
      console.error('Erro ao listar notificações:', error);
      return res.status(500).json({ 
        error: 'Erro ao listar notificações',
        details: error.message 
      });
    }
  }
  
  // Criar log de notificação
  async store(req, res) {
    try {
      const {
        tenant_id,
        template_type,
        channel,
        recipient,
        recipient_name,
        message,
        metadata
      } = req.body;
      
      const notification = await NotificationLog.create({
        tenant_id,
        template_type,
        channel,
        recipient,
        recipient_name,
        message,
        metadata,
        status: 'pending'
      });
      
      return res.status(201).json(notification);
      
    } catch (error) {
      console.error('Erro ao criar log de notificação:', error);
      return res.status(500).json({ 
        error: 'Erro ao criar log de notificação',
        details: error.message 
      });
    }
  }
  
  // Atualizar status de notificação
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, error_message } = req.body;
      
      const update = {
        status
      };
      
      if (status === 'sent') {
        update.sent_at = new Date();
      }
      
      if (error_message) {
        update.error_message = error_message;
      }
      
      const notification = await NotificationLog.findByIdAndUpdate(
        id,
        update,
        { new: true }
      ).populate('tenant_id', 'nome_fantasia');
      
      if (!notification) {
        return res.status(404).json({ error: 'Notificação não encontrada' });
      }
      
      return res.json(notification);
      
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      return res.status(500).json({ 
        error: 'Erro ao atualizar status',
        details: error.message 
      });
    }
  }
  
  // Reenviar notificação
  async resend(req, res) {
    try {
      const { id } = req.params;
      
      const notification = await NotificationLog.findById(id)
        .populate('tenant_id');
      
      if (!notification) {
        return res.status(404).json({ error: 'Notificação não encontrada' });
      }
      
      // Criar nova entrada de log para o reenvio
      const newNotification = await NotificationLog.create({
        tenant_id: notification.tenant_id._id,
        template_type: notification.template_type,
        channel: notification.channel,
        recipient: notification.recipient,
        recipient_name: notification.recipient_name,
        message: notification.message,
        metadata: notification.metadata,
        status: 'pending'
      });
      
      // TODO: Implementar envio real via Z-API/Email
      // Por enquanto, simular sucesso
      newNotification.status = 'sent';
      newNotification.sent_at = new Date();
      await newNotification.save();
      
      return res.json({
        message: 'Notificação reenviada com sucesso',
        notification: newNotification
      });
      
    } catch (error) {
      console.error('Erro ao reenviar notificação:', error);
      return res.status(500).json({ 
        error: 'Erro ao reenviar notificação',
        details: error.message 
      });
    }
  }
  
  // Enviar notificação manual
  async sendManual(req, res) {
    try {
      const {
        tenant_id,
        channel,
        recipient,
        recipient_name,
        message
      } = req.body;
      
      // Validar campos obrigatórios
      if (!tenant_id || !channel || !recipient || !message) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: tenant_id, channel, recipient, message' 
        });
      }
      
      // Criar log
      const notification = await NotificationLog.create({
        tenant_id,
        template_type: 'manual',
        channel,
        recipient,
        recipient_name: recipient_name || 'Cliente',
        message,
        status: 'pending'
      });
      
      // TODO: Implementar envio real via Z-API/Email
      // Por enquanto, simular sucesso
      notification.status = 'sent';
      notification.sent_at = new Date();
      await notification.save();
      
      return res.json({
        message: 'Notificação enviada com sucesso',
        notification
      });
      
    } catch (error) {
      console.error('Erro ao enviar notificação manual:', error);
      return res.status(500).json({ 
        error: 'Erro ao enviar notificação manual',
        details: error.message 
      });
    }
  }
  
  // Deletar notificação do histórico
  async delete(req, res) {
    try {
      const { id } = req.params;
      
      const notification = await NotificationLog.findByIdAndDelete(id);
      
      if (!notification) {
        return res.status(404).json({ error: 'Notificação não encontrada' });
      }
      
      return res.json({ message: 'Notificação deletada com sucesso' });
      
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
      return res.status(500).json({ 
        error: 'Erro ao deletar notificação',
        details: error.message 
      });
    }
  }
}

export default new NotificationLogController();
