/* eslint-disable no-await-in-loop */
import { Op } from 'sequelize';

import CTO from '../models/CTO';
import Client from '../models/Client';

class CTOController {
  async index(req, res) {
    const CTOs = await CTO.findAll({
      where: {
        longitude: {
          [Op.ne]: '',
        },
      },
    });

    // Verifica se exitem CTOs
    if (!CTOs) {
      return res.status(204).json({ message: 'No CTOs to be listed' });
    }

    function deg2rad(deg) {
      return deg * (Math.PI / 180);
    }

    function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
      const R = 6371; // Radius of the earth in km
      const dLat = deg2rad(lat2 - lat1); // deg2rad below
      const dLon = deg2rad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) *
          Math.cos(deg2rad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const d = R * c; // Distance in km
      return d;
    }

    const newCTO_array = [];

    // Verifica quantos clientes estão conectados a cada uma das CTOs
    for (let i = 0; i < CTOs.length; i += 1) {
      const d = getDistanceFromLatLonInKm(
        CTOs[i].latitude,
        CTOs[i].longitude,
        req.params.latitude,
        req.params.longitude
      );

      if (d <= 0.35) {
        const connection_amount = await Client.findAll({
          where: {
            caixa_herm: CTOs[i].nome,
            cli_ativado: 's',
          },
        });

        CTOs[i] = {
          id: CTOs[i].id,
          nome: CTOs[i].nome,
          latitude: CTOs[i].latitude,
          longitude: CTOs[i].longitude,
          connection_amount: connection_amount.length,
        };

        newCTO_array.push(CTOs[i]);
      }
    }

    return res.json(newCTO_array);
  }

  async show(req, res) {
    const cto = await CTO.findOne({
      where: {
        nome: req.params.cto_name,
      },
    });

    if (!cto) {
      return res.status(204).json({ message: 'No CTOs to be listed' });
    }

    const connection_amount = await Client.findAll({
      where: {
        caixa_herm: cto.nome,
        cli_ativado: 's',
      },
    });

    const cto_obj = {
      id: cto.id,
      nome: cto.nome,
      latitude: cto.latitude,
      longitude: cto.longitude,
      connection_amount: connection_amount.length,
    };

    return res.json(cto_obj);
  }
}

export default new CTOController();
