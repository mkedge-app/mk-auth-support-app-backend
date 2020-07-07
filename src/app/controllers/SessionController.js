import jwt from 'jsonwebtoken';

import User from '../models/User';
import Employee from '../models/Employee';

import authConfig from '../../config/auth';

class SessionController {
  async store(req, res) {
    const { login, password } = req.body;

    const user = await User.findOne({
      where: { login },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    user.checkPassword(password);

    if (!(await user.checkPassword(password))) {
      return res.status(401).json({ error: 'Password does not match' });
    }

    const { idacesso, nome, email, cli_grupos } = user;

    const employee_id = await Employee.findOne({
      where: {
        email,
      },
    });

    if (!employee_id) {
      return res.status(401).json({ error: 'User is not an employee' });
    }

    const isAdmin = cli_grupos.includes('full_clientes', 0);

    return res.json({
      user: {
        idacesso,
        nome,
        employee_id: employee_id.id,
        isAdmin,
      },
      token: jwt.sign({ idacesso }, authConfig.secret, {
        expiresIn: authConfig.expiresIn,
      }),
    });
  }
}

export default new SessionController();
