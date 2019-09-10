module.exports = {
  apps : [{
    name: 'BTC Trading API',
    script: './index.js',
    exec_mode: 'cluster',

    // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
    instances: '1',
    autorestart: true,
    watch: false,
    ignore_watch: ["debug.log", "node_modules", ".docker", ".git"],
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }],

  // deploy : {
  //   production : {
  //     user : 'node',
  //     host : '212.83.163.1',
  //     ref  : 'origin/master',
  //     repo : 'git@github.com:repo.git',
  //     path : '/var/www/production',
  //     'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
  //   }
  // }
};
