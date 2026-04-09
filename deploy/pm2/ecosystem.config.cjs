module.exports = {
  apps: [
    {
      name: "delivery-backend",
      cwd: "/var/www/delivery/BackEnd",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: 3000,
        API_BASE_PATH: "/api/v1",
        ENABLE_LEGACY_ROUTES: "false",
      },
      error_file: "/var/log/delivery/backend-error.log",
      out_file: "/var/log/delivery/backend-out.log",
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
