import Notification from '../schemas/notification';

class NotificationController {
  async update(req, res) {
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
        notification.save();
      }
    });

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
