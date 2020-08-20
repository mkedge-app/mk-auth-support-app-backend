import Notification from '../app/schemas/notification';

class DatabaseObserver {
  constructor() {
    this.init();
  }

  init() {}

  async notifyEmployee(employee_id, connectedUsers, io) {
    const notification = await Notification.create({
      content: `2`,
      user: employee_id,
    });

    const socketOwner = connectedUsers[employee_id];

    if (socketOwner) {
      io.to(socketOwner).emit('notification', notification);
    }
  }
}

export default new DatabaseObserver();
