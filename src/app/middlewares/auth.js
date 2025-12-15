import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import logger from '../../logger';
import authConfig from '../../config/auth';

export default async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  const [scheme, token] = authHeader.split(' ');

  if (!/^Bearer$/i.test(scheme) || !token) {
    return res.status(401).json({ error: 'Malformed authorization header' });
  }

  try {
    const decoded = await promisify(jwt.verify)(token, authConfig.secret);
    req.idacesso = decoded.idacesso;
    return next();
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn({ err }, 'Invalid token');
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
