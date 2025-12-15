import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export default pino({
  enabled: true,
  level: isProduction ? 'info' : 'debug',
  transport: !isProduction ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'SYS:dd/mm/yyyy HH:MM:ss',
    }
  } : undefined,
  // Não logar em produção informações sensíveis
  redact: {
    paths: ['req.headers.authorization', 'password', 'token', 'secret'],
    remove: true
  }
});
