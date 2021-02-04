import https from 'https';
import logger from '../logger';
import appConfig from '../config/app';

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
      app_id: appConfig.app_id_push_notification,
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
        logger.info(`Response: ${JSON.parse(data)}`);
      });
    });

    req.on('error', e => {
      logger.error(`Error: ${e}`);
    });

    req.write(JSON.stringify(pushMessage));
    req.end();
  }
}

export default new PushNotificationSender();
