import Notification from '../schemas/notification';

class NotificationController {
  async update(req, res) {
    const { action, employee_id } = req.body;

    switch (action) {
      case 'markAsViewed': {
        const { viewedAt } = req.body;
        const not_viewed_notifications = await Notification.find()
          .where('user')
          .equals(employee_id)
          .sort({ createdAt: 'desc' });

        if (!not_viewed_notifications) {
          return res.status(400).json({ message: 'No notification not found' });
        }

        const response = [];
        not_viewed_notifications.forEach(async element => {
          if (element.viewed === false) {
            element.viewed = true;
            element.viewedAt = viewedAt;
          }

          response.push(element);
        });

        not_viewed_notifications.forEach(async element => {
          const notification = await Notification.findById(element.id);

          if (notification.viewed === false) {
            if (notification) {
              notification.viewed = true;
              notification.viewedAt = viewedAt;
              await notification.save();
            }
          }
        });

        return res.json({ notifications: response });
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

    const notifications = await Notification.find({
      user: employee_id,
    }).sort({ createdAt: 'desc' });

    return res.json({ notifications });
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
