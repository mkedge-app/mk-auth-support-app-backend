import User from '../models/User';
import Permissions from '../models/Permissions';

const permissions = {
  update_employee: 'perm_chamAlterar',
  close_request: 'perm_chamFechar',
  update_visita_time: 'perm_chamAlterar',
  update_visita_date: 'perm_chamAlterar',
  add_note: 'perm_chamResponder',
  update_client: 'perm_altcliente',
  update_client_location: 'perm_altcliente',
  // action: permission
};

export default async (req, res, next) => {
  const { action } = req.body;

  if (!action) {
    return res.status(400).json({
      message: 'Requisição inválida. Ação não informada!',
      code: 400,
    });
  }

  try {
    const { login: userLogin } = await User.findByPk(req.idacesso);

    const permission = await Permissions.findOne({
      where: {
        usuario: userLogin,
        nome: permissions[action],
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
