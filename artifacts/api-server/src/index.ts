import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

// تطبيق الترحيلات تلقائياً عند التشغيل
async function runMigrations() {
  try {
    await db.execute(sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS client_name_override text`);
    await db.execute(sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_cost numeric(10,2) NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS return_date text`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS agency_settings (key text PRIMARY KEY, value text, updated_at timestamptz NOT NULL DEFAULT now())`);
    logger.info("Database migrations applied successfully");
  } catch (err) {
    logger.warn({ err }, "Migration warning (non-fatal)");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await runMigrations();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
