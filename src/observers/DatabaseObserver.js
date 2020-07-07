/* eslint-disable no-console */
// import databaseConfig from '../config/database';

class DatabaseObserver {
  constructor() {
    this.init();
  }

  init() {}

  notifyEmployee(employee_id) {
    console.log(`Um novo chamado foi assinalado para o técnico ${employee_id}`);
  }
}

export default new DatabaseObserver();
