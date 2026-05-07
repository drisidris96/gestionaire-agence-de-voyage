import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("agency_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Setting = typeof settingsTable.$inferSelect;
