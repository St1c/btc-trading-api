module.exports = {
  apps: [{
    name: 'BTC Trading API',
    script: './index.js',
    exec_mode: 'cluster',
    instances: '1',
    autorestart: true,
    watch: true,
    ignore_watch: ["debug.log", "node_modules", ".docker", ".git"],
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
