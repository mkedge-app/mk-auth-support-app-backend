import NotificationSending from '../app/jobs/NotificationSending';
import Queue from '../lib/queue';
import SocketIO from '../lib/socket';

import Notification from '../app/schemas/notification';

class DatabaseObserver {
  async notifyEmployee(employee_id, header, message) {
    const notification = await Notification.create({
      header,
      content: message,
      user: employee_id,
    });

    // eslint-disable-next-line no-underscore-dangle
    const connectedUsers = SocketIO.users;

    const socketOwner = connectedUsers[employee_id];

    if (socketOwner) {
      await Queue.add(NotificationSending.key, {
        notification,
        socketOwner,
      });
    }
  }
}

export default new DatabaseObserver();
