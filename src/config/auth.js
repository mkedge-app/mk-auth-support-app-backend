export default {
  secret: process.env.AUTH_SECRET || 'updsuportesecretkey',
  expiresIn: process.env.AUTH_EXPIRESIN || '7d',
};
