import { Op } from 'sequelize';
import CTO from '../models/CTO';

class CTOController {
  async index(req, res) {
    const CTOs = await CTO.findAll({
      where: {
        longitude: {
          [Op.ne]: "",
        },
      },
    });

    // Verifica se exitem CTOs
    if (!CTOs) {
      return res
        .status(204)
        .json({ message: 'No CTOs to be listed' });
    }

    return res.json(CTOs);
  }
}

export default new CTOController();
