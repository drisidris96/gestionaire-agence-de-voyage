#!/usr/bin/env node
// سكريبت الترحيل — يُشغَّل مباشرة بـ node على الخادم
// الاستخدام: node deploy/migrate.mjs

import { readFileSync } from "fs";
import pg from "pg";

// قراءة DATABASE_URL من .env
let dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  try {
    const env = readFileSync("/var/www/travel/.env", "utf8");
    const match = env.match(/DATABASE_URL=(.+)/);
    if (match) dbUrl = match[1].trim();
  } catch {}
}

if (!dbUrl) {
  console.error("❌ لم يتم العثور على DATABASE_URL");
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl });

try {
  await client.connect();
  console.log("✅ تم الاتصال بقاعدة البيانات");

  const migrations = [
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS client_name_override text`,
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_cost numeric(10,2) NOT NULL DEFAULT 0`,
    `CREATE TABLE IF NOT EXISTS agency_settings (key text PRIMARY KEY, value text, updated_at timestamptz NOT NULL DEFAULT now())`,
  ];

  for (const sql of migrations) {
    await client.query(sql);
    console.log("✅", sql.slice(0, 60) + "...");
  }

  // تحقق من النتيجة
  const { rows } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name IN ('payments','bookings')
    AND column_name IN ('client_name_override','service_cost')
    ORDER BY table_name, column_name
  `);
  console.log("\n✅ الأعمدة الموجودة الآن:", rows.map(r => r.column_name).join(", "));
  console.log("\n🎉 تم تطبيق جميع التعديلات بنجاح!");
} catch (err) {
  console.error("❌ خطأ:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
