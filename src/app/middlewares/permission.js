import User from '../models/User';
import Permissions from '../models/Permissions';

export default async (req, res, next) => {
  try {
    const { login: userLogin } = await User.findByPk(req.idacesso);

    const permission = await Permissions.findOne({
      where: {
        usuario: userLogin,
        nome: req.body.permission,
      },
    });

    if (!(permission.dataValues.permissao === 'sim')) {
      return res.status(401).json({
        message: 'Para obter acesso, solicite ao administrador do sistema',
        code: 401,
      });
    }

    return next();
  } catch (err) {
    return res.status(401).json({
      message:
        'Não foi possível confirmar se você tem permissão para realizar esta operação',
      code: 401,
    });
  }
};
