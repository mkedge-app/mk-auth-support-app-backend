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
    // eslint-disable-next-line radix
    const employee_id = parseInt(req.params.employee_id);

    const notifications = await Notification.findAll({
      where: {
        // eslint-disable-next-line radix
        user: employee_id,
      },
      order: [['created_at', 'DESC']],
    });

    return res.json({ notifications });
  }
}

export default new NotificationController();
