import jwt from 'jsonwebtoken';
import AdminUser from '../models/AdminUser';

export default async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    return res.status(401).json({ error: 'Token malformado' });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ error: 'Token malformado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mk-edge-super-secret-key-2024');

    // Verificar se é admin
    if (decoded.type !== 'admin' && decoded.type !== 'super') {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    // Buscar usuário
    const admin = await AdminUser.findById(decoded.id);

    if (!admin || !admin.active) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    req.adminId = decoded.id;
    req.adminType = decoded.type;

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};
