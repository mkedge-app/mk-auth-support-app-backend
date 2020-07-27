import Client from '../models/Client';
import Radacct from '../models/Radacct';

class UserConnectionsController {
  async show(req, res) {
    const { id: client_id } = req.params;

    const client = await Client.findByPk(client_id);

    if (!client) {
      return res.status(400).json({ message: 'No client found' });
    }

    const client_connections = await Radacct.findAll({
      where: {
        username: client.login,
      },
      limit: 10,
      order: [['acctstarttime', 'DESC']],
    });

    if (!client_connections) {
      return res.status(400).json({ message: 'No connection data available' });
    }

    return res.json(client_connections);
  }
}

export default new UserConnectionsController();
