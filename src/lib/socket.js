import io from 'socket.io';
import logger from '../logger';
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
      logger.info(`Employee ${employee_id} has been connected to websocket`);

      this.connectedUsers[employee_id] = {
        socketId: socket.id,
        oneSignalUserId,
      };

      PushNotificationSender.addNewUser({
        employee_id,
        oneSignalUserId,
      });

      logger.info(`List of push notification users:`);
      logger.info(PushNotificationSender.connectedUsers);

      socket.on('disconnect', () => {
        logger.info(
          `The employee ${employee_id} disconnected from this websocket`
        );

        delete this.connectedUsers[employee_id];

        logger.info(`List of push notification users:`);
        logger.info(PushNotificationSender.connectedUsers);
      });

      socket.on('error', err => {
        logger.error(`Socket.io Error: ${err.stack}`); // this is changed from your code in the last comment
      });

      socket.on('online', () => {
        // logger.info('I am alive');
      });
    });
  }
}

export default new SocketIO();
