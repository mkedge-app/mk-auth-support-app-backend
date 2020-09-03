/* eslint-disable no-console */
import https from 'https';

class PushNotificationSender {
  constructor() {
    this.connectedUsers = {};
  }

  addNewUser(data) {
    const { employee_id, oneSignalUserId } = data;

    if (this.connectedUsers[employee_id] !== oneSignalUserId) {
      this.connectedUsers[employee_id] = oneSignalUserId;
    }
  }

  pushNotification(message, employee_id) {
    const pushMessage = {
      app_id: 'ba39cc13-1ac4-46f6-82f5-929b5b3a6562',
      contents: { en: message },
      include_player_ids: [this.connectedUsers[employee_id]],
    };

    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
    };

    const options = {
      host: 'onesignal.com',
      port: 443,
      path: '/api/v1/notifications',
      method: 'POST',
      headers,
    };

    const req = https.request(options, res => {
      res.on('data', data => {
        console.log('Response:');
        console.log(JSON.parse(data));
      });
    });

    req.on('error', e => {
      console.log('ERROR:');
      console.log(e);
    });

    req.write(JSON.stringify(pushMessage));
    req.end();
  }
}

export default new PushNotificationSender();
