module.exports = {
  apps: [{
    name: 'glamping-backend',
    script: 'dist/main.js',
    instances: 1,
    exec_mode: 'fork',
    env_file: '.env.production',
    env: {
      NODE_ENV: 'production',
    },
    max_memory_restart: '300M',
    node_args: '--max-old-space-size=300',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/log/pm2/glamping-error.log',
    out_file: '/var/log/pm2/glamping-out.log',
    merge_logs: true,
    restart_delay: 5000,
    max_restarts: 10,
    watch: false,
  }],
};
