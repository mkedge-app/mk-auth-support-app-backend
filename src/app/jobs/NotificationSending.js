import SocketIO from '../../lib/socket';

class NotificationSending {
  get key() {
    return 'NotificationSending';
  }

  async handle({ data }) {
    const { socketOwner } = data;
    const io = SocketIO.ioEmit;
    io.to(socketOwner).emit('notification');
  }
}

export default new NotificationSending();
