module.exports = {
  apps: [{
    name: 'mk-auth-backend',
    script: 'src/server.js',
    interpreter: 'node',
    interpreter_args: '-r sucrase/register',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    
    // Estratégias de restart automático
    min_uptime: '10s',          // Considera "online" após 10s
    max_restarts: 10,            // Máximo de 10 restarts em...
    restart_delay: 4000,         // Aguarda 4s antes de reiniciar
    
    // Kill timeout
    kill_timeout: 5000,
    
    // Listen timeout
    listen_timeout: 10000,
    
    // Exponential backoff restart delay
    exp_backoff_restart_delay: 100
  }]
};
