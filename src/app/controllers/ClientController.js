/* eslint-disable array-callback-return */
/* eslint-disable no-unused-vars */
import Client from '../models/Client';

class ClientController {
  async index(req, res) {
    const clients = await Client.findAll({
      attributes: ['id', 'nome'],
    });

    // Remove espaço em branco no inicio da string e coloca todos os nomes em Maiusculo
    clients.map((client, index) => {
      clients[index].nome = client.nome.toUpperCase();

      if (client.nome[0] === ' ') {
        clients[index].nome = client.nome.trim();
      }
    });

    // Ordena todos os clientes em ordem alfabetica
    clients.sort((a, b) => {
      if (a.nome < b.nome) {
        return -1;
      }
      if (a.nome > b.nome) {
        return 1;
      }
      return 0;
    });

    // Agrupa os nome com base na sua inicial
    const data = clients.reduce((r, e) => {
      const group = e.nome[0];

      if (!r[group]) r[group] = { group, children: [e] };
      else r[group].children.push(e);

      return r;
    }, {});

    const result = Object.values(data);

    return res.json(result);
  }

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
