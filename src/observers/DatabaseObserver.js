import Notification from '../app/schemas/notification';

class DatabaseObserver {
  constructor() {
    this.init();
  }

  init() {}

  async notifyEmployee(employee_id) {
    await Notification.create({
      content: `Um novo chamado foi assinalado para o técnico ${employee_id}`,
      user: employee_id,
    });
  }
}

export default new DatabaseObserver();
