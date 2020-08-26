import SocketIO from '../../lib/socket';

class NotificationSending {
  get key() {
    return 'NotificationSending';
  }

  async handle({ data }) {
    const { notification, socketOwner } = data;
    const io = SocketIO.ioEmit;
    io.to(socketOwner).emit('notification', notification);
  }
}

export default new NotificationSending();
