import Notification from '../schemas/notification';

class NotificationController {
  async update(req, res) {
    const { action } = req.body;

    switch (action) {
      case 'markAsViewed': {
        const { employee_id, viewedAt } = req.body;
        const not_viewed_notifications = await Notification.find()
          .where('viewed')
          .equals(false)
          .where('user')
          .equals(employee_id);

        not_viewed_notifications.forEach(async element => {
          const notification = await Notification.findById(element.id);

          if (notification) {
            notification.viewed = true;
            notification.viewedAt = viewedAt;
            await notification.save();
          }
        });

        break;
      }

      case 'markAsRead': {
        const { notification_id } = req.body;

        const notification = await Notification.findById(notification_id);
        if (notification) {
          notification.isRead = true;
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
    const { employee_id } = req.params;

    const notifications = await Notification.find({
      user: employee_id,
    }).sort({ createdAt: 'desc' });

    return res.json({ notifications });
  }
}

export default new NotificationController();
