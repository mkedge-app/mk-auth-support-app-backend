import { connectNewTenantsDB } from '../middlewares/connectionResolver';
import Tenant from '../schemas/Tenant';

class ProviderController {
  async create(req, res) {
    const { nome, cnpj } = req.body;
    const { dialect, host, username, password, database } = req.body;

    const provider = await Tenant.create({
      nome,
      cnpj,
      dialect,
      host,
      username,
      password,
      database,
    });

    connectNewTenantsDB(provider);

    return res.json({ provider });
  }
}

export default new ProviderController();
