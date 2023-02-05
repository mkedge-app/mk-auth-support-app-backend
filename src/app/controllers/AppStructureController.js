/* eslint-disable array-callback-return */
import User from '../models/User';
import Permissions from '../models/Permissions';

class AppStructureController {
  async index(req, res) {
    const { employee_id } = req.query;

    const { login } = await User.findOne({
      where: {
        func: employee_id,
      },
    });

    const permissions = await Permissions.findAll({
      where: {
        usuario: login,
      },
    });

    let perm_clifin = false;
    permissions.map(permission => {
      if (permission.nome === 'perm_clifin') {
        perm_clifin = permission.permissao === 'sim';
      }
    });

    return res.json({ showClientFinancing: perm_clifin });
  }
}

export default new AppStructureController();
