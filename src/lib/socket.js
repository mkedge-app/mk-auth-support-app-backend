/* eslint-disable no-console */
import io from 'socket.io';
import PushNotificationSender from './oneSignal';

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
      const { employee_id, oneSignalUserId } = socket.handshake.query;
      console.log(`Employee ${employee_id} has been connected to websocket`);

      this.connectedUsers[employee_id] = {
        socketId: socket.id,
        oneSignalUserId,
      };

      PushNotificationSender.addNewUser({
        employee_id,
        oneSignalUserId,
      });

      console.log(`List of push notification users:`);
      console.log(PushNotificationSender.connectedUsers);

      socket.on('disconnect', () => {
        console.log(
          `The employee ${employee_id} disconnected from this websocket`
        );

        delete this.connectedUsers[employee_id];

        console.log(`List of push notification users:`);
        console.log(PushNotificationSender.connectedUsers);
      });

      socket.on('error', err => {
        console.log('Socket.IO Error');
        console.log(err.stack); // this is changed from your code in last comment
      });

      socket.on('online', () => {
        // console.log('I am alive');
      });
    });
  }
}

export default new SocketIO();
