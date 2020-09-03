import NotificationSending from '../app/jobs/NotificationSending';

import Queue from '../lib/queue';
import SocketIO from '../lib/socket';
import PushNotificationSender from '../lib/oneSignal';

import Notification from '../app/models/Notification';

class DatabaseObserver {
  async notifyEmployee(employee_id, header, message, request_data) {
    const created_notification = await Notification.create({
      header,
      content: message,
      user: employee_id,
      request_data: JSON.stringify(request_data),
      created_at: new Date(),
    });

    if (created_notification) {
      const connectedUsers = SocketIO.users;

      if (connectedUsers[employee_id]) {
        const socketOwner = connectedUsers[employee_id].socketId;

        await Queue.add(NotificationSending.key, {
          socketOwner,
        });
      }

      // Envio da push notification
      PushNotificationSender.pushNotification(message, employee_id);
    }
  }
}

export default new DatabaseObserver();
