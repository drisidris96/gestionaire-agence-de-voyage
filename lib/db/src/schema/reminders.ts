import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const remindersTable = pgTable("reminders", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: text("due_date").notNull(),
  type: text("type").notNull().default("general"),
  isCompleted: boolean("is_completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Reminder = typeof remindersTable.$inferSelect;
