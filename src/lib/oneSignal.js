/* eslint-disable no-console */
import https from 'https';

class PushNotificationSender {
  pushNotification(message) {
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

    req.write(JSON.stringify(message));
    req.end();
  }
}

export default new PushNotificationSender();
