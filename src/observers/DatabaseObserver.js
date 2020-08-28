import NotificationSending from '../app/jobs/NotificationSending';

import Queue from '../lib/queue';
import SocketIO from '../lib/socket';
import PushNotificationSender from '../lib/oneSignal';

import Notification from '../app/schemas/notification';

class DatabaseObserver {
  async notifyEmployee(employee_id, header, message, request_data) {
    const notification = await Notification.create({
      header,
      content: message,
      user: employee_id,
      request_data,
    });

    // eslint-disable-next-line no-underscore-dangle
    const connectedUsers = SocketIO.users;

    const socketOwner = connectedUsers[employee_id].socketId;
    const { oneSignalUserId } = connectedUsers[employee_id];

    if (socketOwner) {
      await Queue.add(NotificationSending.key, {
        notification,
        socketOwner,
      });

      // Envio da push notification
      const pushNotificationMessage = {
        app_id: 'ba39cc13-1ac4-46f6-82f5-929b5b3a6562',
        contents: { en: 'English Message' },
        include_player_ids: [oneSignalUserId],
      };

      PushNotificationSender.pushNotification(pushNotificationMessage);
    }
  }
}

export default new DatabaseObserver();
