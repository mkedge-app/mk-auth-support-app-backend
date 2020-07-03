import Client from '../models/Client';

class ClientController {
  async show(req, res) {
    const { id: client_id } = req.params;

    const client = await Client.findByPk(client_id);

    if (!client) {
      return res.status(400).json({ message: 'No client not found' });
    }

    return res.json(client);
  }

  async update(req, res) {
    const { id: client_id } = req.params;

    const { latitude, longitude, new_cto } = req.body;

    const client = await Client.findByPk(client_id);

    if (!client) {
      return res.status(400).json({ message: 'No client not found' });
    }

    if (new_cto) {
      // const [, cto_number] = new_cto.split('-');

      // const porta_olt = cto_number[0];
      // const porta_splitter = cto_number.slice(-1)[0];

      client.caixa_herm = new_cto;
      // client.porta_olt = porta_olt;
      // client.porta_splitter = porta_splitter;
    }

    if (latitude && longitude) {
      client.coordenadas = `${latitude},${longitude}`;
    }

    await client.save();

    return res.sendStatus(200);
  }
}

export default new ClientController();
