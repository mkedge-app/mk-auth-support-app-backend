import Client from '../models/Client';

class ClientController {
  async show(req, res) {
    const {id: client_id} = req.params;

    const client = await Client.findByPk(client_id);
    
    if (!client) {
      return res
        .status(400)
        .json({ message: 'No client not found' });
    }

    return res.json(client);
  }

  async update(req, res) {
    const {id: client_id} = req.params;
    
    const { latitude, longitude, new_cto } = req.body;

    const client = await Client.findByPk(client_id);

    if (!client) {
      return res
        .status(400)
        .json({ message: 'No client not found' });
    }

    if (new_cto) {
      client.caixa_herm = new_cto;
    }

    if (latitude && longitude) {
      client.coordenadas = `${latitude},${longitude}`;
    }
    await client.save();
    
    return res.json(client);
    return res.sendStatus(200);
  }
}

export default new ClientController();
