import Notification from '../app/schemas/notification';

class DatabaseObserver {
  constructor() {
    this.init();
  }

  init() {}

  async notifyEmployee(employee_id, connectedUsers, io, header, message) {
    const notification = await Notification.create({
      header,
      content: message,
      user: employee_id,
    });

    const socketOwner = connectedUsers[employee_id];

    if (socketOwner) {
      io.to(socketOwner).emit('notification', notification);
    }
  }
}

export default new DatabaseObserver();
