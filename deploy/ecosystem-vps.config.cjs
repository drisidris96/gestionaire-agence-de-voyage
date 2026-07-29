module.exports = {
  apps: [
    {
      name: "travel-api",
      cwd: "/var/www/travel/api",
      script: "./dist/index.mjs",
      node_args: "--enable-source-maps",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: "8080",
      },
      env_file: "/var/www/travel/.env",
      error_file: "/var/log/travel/api-error.log",
      out_file: "/var/log/travel/api-out.log",
      time: true,
      autorestart: true,
      watch: false,
    },
  ],
};
