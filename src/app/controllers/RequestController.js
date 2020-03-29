import { parseISO, addHours, format } from 'date-fns';

import Request from '../models/Request';
import Client from '../models/Client';
import Mensagem from '../models/Mensagem';
import SystemLog from '../models/SystemLog';

class RequestController {
  async show(req, res) {
    const { tecnico, date } = req.body;

    const requests = await Request.findAll({
      where: {
        tecnico,
      },
    });

    // Verifica se exitem chamadas para o técnico informado
    if (!requests) {
      return res
        .status(204)
        .json({ message: 'No support requests for this user!' });
    }

    const givenDateRequests = [];

    // eslint-disable-next-line array-callback-return
    requests.map((item, index) => {
      const dataBaseTime = format(item.visita, "yyyy-MM-dd'T'00:00:00");
      const apiTime = format(
        addHours(parseISO(date), 4),
        "yyyy-MM-dd'T'HH:mm:ss"
      );

      if (dataBaseTime === apiTime) {
        givenDateRequests.push(requests[index]);
      }
    });

    // Verifica se existem visitas agendadas para a data informada
    if (givenDateRequests.length < 1) {
      return res
        .status(204)
        .json({ error: 'No support requests fot this date' });
    }

    let index = givenDateRequests.length - 1;

    const response_object = [];

    do {
      const { login, chamado } = givenDateRequests[index];

      // eslint-disable-next-line no-await-in-loop
      const response = await Client.findOne({
        where: {
          login,
        },
      });

      // eslint-disable-next-line no-await-in-loop
      const msg = await Mensagem.findOne({
        where: {
          chamado,
        },
      });

      response_object.push({
        id: givenDateRequests[index].id,
        chamado: givenDateRequests[index].chamado,
        visita: format(addHours(givenDateRequests[index].visita, 4), 'HH:mm'),
        nome: givenDateRequests[index].nome,
        status: givenDateRequests[index].status,
        assunto: givenDateRequests[index].assunto,
        endereco: response.endereco,
        numero: response.numero,
        bairro: response.bairro,
        coordenadas: response.coordenadas,
        mensagem: msg.msg,
      });

      index -= 1;
    } while (index >= 0);

    // Organizando array em ordem crescente de visita
    response_object.sort(function(a, b) {
      var keyA = a.visita,
        keyB = b.visita;

      if (keyA < keyB) return -1;
      if (keyA > keyB) return 1;
      return 0;
    });

    return res.json(response_object);
  }

  async update(req, res) {
    const { id } = req.body;

    const request = await Request.findByPk(id);

    if (!request) {
      return res.status(400).json({ error: 'This ticket does not exist' });
    }

    if (request.status === 'fechado') {
      return res.status(405).json({ error: 'Ticket already closed' });
    }

    const date = new Date();

    const formattedDate = format(date, 'dd-MM-yyyy HH:mm:ss');

    // Request closing
    request.status = 'fechado';
    request.fechamento = formattedDate;
    await request.save();

    // Saving system log
    const { chamado, nome } = request;
    const { login } = req.body;

    const logDate = format(date, 'dd/MM/yyyy HH:mm:ss');

    const log = await SystemLog.create({
      registro: `fechou o chamado ${chamado} de: ${nome}`,
      data: logDate,
      login,
      tipo: 'app',
      operacao: 'OPERNULL',
    });

    return res.json(log);
  }
}

export default new RequestController();
