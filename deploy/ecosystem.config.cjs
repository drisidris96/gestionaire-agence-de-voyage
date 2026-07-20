// PM2 Ecosystem — ضعه في جذر المشروع على الـ VPS
// أو شغّل:  pm2 start deploy/ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: "chouiaar-api",
      script: "./artifacts/api-server/dist/index.mjs",
      cwd: "/var/www/chouiaar",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: "8080",
        // DATABASE_URL يُقرأ من ملف .env تلقائياً عبر dotenv أو يُحدَّد هنا
      },
      env_file: "/var/www/chouiaar/.env",
      error_file: "/var/log/pm2/chouiaar-api-error.log",
      out_file: "/var/log/pm2/chouiaar-api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
