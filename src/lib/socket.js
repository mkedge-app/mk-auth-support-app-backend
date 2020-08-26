/* eslint-disable no-console */
import io from 'socket.io';

class SocketIO {
  constructor() {
    this.connectedUsers = {};
    this.io = null;
  }

  get users() {
    return this.connectedUsers;
  }

  get ioEmit() {
    return this.io;
  }

  start(http_server) {
    this.io = io(http_server);

    this.io.on('connection', socket => {
      const { employee_id } = socket.handshake.query;
      this.connectedUsers[employee_id] = socket.id;

      console.log(this.connectedUsers);

      socket.on('disconnect', () => {
        delete this.connectedUsers[employee_id];
      });

      socket.on('error', err => {
        console.log('Socket.IO Error');
        console.log(err.stack); // this is changed from your code in last comment
      });
    });
  }
}

export default new SocketIO();
