import Notification from '../schemas/notification';

class NotificationController {
  async show(req, res) {
    const { employee_id } = req.params;

    const notificatios = await Notification.find({
      user: employee_id,
    });

    return res.json({ notificatios });
  }
}

export default new NotificationController();
