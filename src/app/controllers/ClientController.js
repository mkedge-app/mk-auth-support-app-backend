import Client from '../models/Client';

class ClientController {
  async update(req, res) {
    const {id: client_id, latitude, longitude} = req.params;

    const client = await Client.findByPk(client_id);

    if (!client) {
      return res
        .status(400)
        .json({ message: 'No client not found' });
    }
    
    client.coordenadas = `${latitude},${longitude}`;
    // await client.save();

    return res.sendStatus(200);
  }
}

export default new ClientController();
